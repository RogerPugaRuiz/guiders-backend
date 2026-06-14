/**
 * Command handler que refresca un embed token.
 *
 * Validaciones (en orden):
 *  1. `validateToken(oldToken)` — si falla, distinguir:
 *     - NotFound (token expirado o revocado) → EmbedTokenExpiredError → 401
 *     - InvalidFormat / Corrupted / generic Error → EmbedTokenInvalidError → 401
 *  2. Verifica `embedEnabled=true` para el `companyId` del token
 *     (defense in depth: si el tenant desactivó embed post-emisión, el
 *     token existente también es revocado)
 *     Si no → EmbedTokenExpiredError → 401
 *  3. Si el comando incluye un `expectedUserId` (opcional), valida que
 *     coincida con el del token. Si no → EmbedTokenUserMismatchError → 403
 *  4. Llama `embedTokens.refreshToken(oldToken)` (atomic Lua script)
 *  5. Retorna `ok({ token, expiresAt })`
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
} from '../../domain/errors/embed-token.errors';
import { RefreshEmbedTokenCommand } from './refresh-embed-token.command';

export interface RefreshEmbedTokenResult {
  token: string;
  expiresAt: string;
}

@Injectable()
export class RefreshEmbedTokenCommandHandler {
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
      // Distinguish expired (NotFound) vs invalid (everything else)
      if (errValue.name === 'EmbedTokenNotFoundError') {
        return err(new EmbedTokenExpiredError());
      }
      // InvalidFormat, Corrupted, or generic EmbedTokenError
      return err(new EmbedTokenInvalidError());
    }

    const tokenInfo = tokenData.unwrap();

    // 2. Defense in depth: verify embed still enabled for the token's tenant
    const configResult = await this.whiteLabelRepository.findByCompanyId(
      tokenInfo.companyId,
    );
    if (configResult.isErr() || !configResult.unwrap().embedEnabled) {
      return err(new EmbedTokenExpiredError());
    }

    // 3. Optional: validate userId match (AC#3 defensivo)
    if (command.expectedUserId && command.expectedUserId !== tokenInfo.userId) {
      return err(new EmbedTokenUserMismatchError());
    }

    // 4. Refresh the token (atomic Lua script: GETDEL + SET EX)
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
