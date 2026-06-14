/**
 * Command handler que refresca un embed token.
 *
 * Validaciones (en orden):
 *  1. `validateToken(oldToken)` — si falla, distinguir:
 *     - NotFound (token expirado o revocado) → EmbedTokenExpiredError → 401
 *     - InvalidFormat / Corrupted / generic Error → EmbedTokenInvalidError → 401
 *  2. Cross-check de tenant: si la API key está presente (defense in depth),
 *     el `companyId` de la API key debe coincidir con el del token.
 *  3. Verifica `embedEnabled=true` para el `companyId` del token
 *     (defense in depth: si el tenant desactivó embed post-emisión, el
 *     token existente también es revocado) → EmbedTokenExpiredError → 401
 *     o si Mongo down → EmbedTokenError (genérico) → 503
 *  4. Si el comando incluye un `expectedUserId` (opcional), valida que
 *     coincida con el del token. Si no → EmbedTokenUserMismatchError → 403
 *  5. Llama `embedTokens.refreshToken(oldToken)` (atomic Lua script)
 *  6. Retorna `ok({ token, expiresAt })`
 *
 * El `userId` del token se preserva implícitamente porque `refreshToken`
 * lee los datos del token viejo y los usa para el nuevo.
 */

import { Inject, Injectable } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  IWhiteLabelConfigRepository,
  WHITE_LABEL_CONFIG_REPOSITORY,
} from 'src/context/white-label/domain/white-label-config.repository';
import {
  EMBED_TOKEN_SERVICE,
  IEmbedTokenService,
} from '../../domain/services/embed-token.service';
import {
  EmbedTokenExpiredError,
  EmbedTokenInvalidError,
  EmbedTokenUserMismatchError,
  EmbedTokenError,
  EmbedTokenNotFoundError,
  EmbedTokenInvalidFormatError,
  EmbedTokenCorruptedError,
} from '../../domain/errors/embed-token.errors';
import { RefreshEmbedTokenCommand } from './refresh-embed-token.command';
import { Logger } from '@nestjs/common';

export interface RefreshEmbedTokenResult {
  token: string;
  expiresAt: string;
}

@Injectable()
export class RefreshEmbedTokenCommandHandler {
  private readonly logger = new Logger(RefreshEmbedTokenCommandHandler.name);

  constructor(
    @Inject(EMBED_TOKEN_SERVICE)
    private readonly embedTokens: IEmbedTokenService,
    @Inject(WHITE_LABEL_CONFIG_REPOSITORY)
    private readonly whiteLabelRepository: IWhiteLabelConfigRepository,
  ) {}

  async execute(
    command: RefreshEmbedTokenCommand,
  ): Promise<Result<RefreshEmbedTokenResult, DomainError>> {
    // 1. Validate token (returns EmbedTokenData with userId, companyId, roles)
    const tokenData = await this.embedTokens.validateToken(command.token);
    if (tokenData.isErr()) {
      const errValue = tokenData.error;
      if (errValue instanceof EmbedTokenNotFoundError) {
        return err(new EmbedTokenExpiredError());
      }
      // InvalidFormat, Corrupted, or generic Error
      return err(new EmbedTokenInvalidError());
    }

    const tokenInfo = tokenData.unwrap();

    // 2. Cross-check tenant (defense in depth)
    if (
      command.apiKeyCompanyId &&
      command.apiKeyCompanyId !== tokenInfo.companyId
    ) {
      this.logger.warn(
        `Tenant mismatch en refresh: API key companyId=${command.apiKeyCompanyId} vs token companyId=${tokenInfo.companyId}`,
      );
      return err(new EmbedTokenUserMismatchError());
    }

    // 3. Defense in depth: verify embed still enabled for the token's tenant
    const configResult = await this.whiteLabelRepository.findByCompanyId(
      tokenInfo.companyId,
    );
    if (configResult.isErr()) {
      // Distinguish "tenant doesn't have config" (revocación) from
      // "Mongo down" (incidente operacional). WhiteLabelConfigNotFoundError
      // means tenant disabled embed or never enabled it. Anything else is
      // infrastructure (Mongo down, timeout, etc.) → 503.
      const errValue = configResult.error;
      const isConfigNotFound = errValue.name === 'WhiteLabelConfigNotFoundError';
      if (isConfigNotFound) {
        this.logger.warn(
          `Refresh rechazado: white_label_config no encontrada para companyId=${tokenInfo.companyId}`,
        );
        return err(new EmbedTokenExpiredError());
      }
      this.logger.error(
        `Error de infraestructura buscando white_label_config para companyId=${tokenInfo.companyId}: ${errValue.message}`,
      );
      return err(
        new EmbedTokenError(
          `White-label config no disponible: ${errValue.message}`,
        ),
      );
    }
    if (!configResult.unwrap().embedEnabled) {
      this.logger.warn(
        `Refresh rechazado: embed deshabilitado para companyId=${tokenInfo.companyId} (admin toggled embedEnabled=false)`,
      );
      return err(new EmbedTokenExpiredError());
    }

    // 4. Optional: validate userId match (AC#3 defensivo)
    if (command.expectedUserId && command.expectedUserId !== tokenInfo.userId) {
      return err(new EmbedTokenUserMismatchError());
    }

    // 5. Refresh the token (atomic Lua script: GETDEL + SET EX)
    const refreshResult =
      await this.embedTokens.refreshToken(command.token);
    if (refreshResult.isErr()) {
      return err(refreshResult.error);
    }

    const issued = refreshResult.unwrap();
    return ok({
      token: issued.token,
      expiresAt: issued.expiresAt,
    });
  }
}
