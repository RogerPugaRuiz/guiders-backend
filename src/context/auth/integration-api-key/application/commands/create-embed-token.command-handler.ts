/**
 * Command handler que orquesta la emisión de un embed token.
 *
 * Validaciones (en orden, para no leak info):
 *  1. `embedEnabled=true` para el `companyId` (white_label_configs)
 *  2. `userId` existe y pertenece a `companyId` (user_accounts)
 *  3. Llama a `EmbedTokenService.createToken(companyId, userId, roles)`
 *
 * Cualquier fallo de seguridad retorna `EmbedTokenForbiddenError` con
 * un código específico que el controller traduce a HTTP 403.
 */

import { Inject, Injectable } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  IWhiteLabelConfigRepository,
  WHITE_LABEL_CONFIG_REPOSITORY,
} from 'src/context/white-label/domain/white-label-config.repository';
import {
  USER_ACCOUNT_REPOSITORY,
  UserAccountRepository,
} from 'src/context/auth/auth-user/domain/user-account.repository';
import {
  EMBED_TOKEN_SERVICE,
  IEmbedTokenService,
} from '../../domain/services/embed-token.service';
import {
  EmbedTokenForbiddenError,
  EmbedTokenError,
} from '../../domain/errors/embed-token.errors';
import { CreateEmbedTokenCommand } from './create-embed-token.command';

export interface CreateEmbedTokenResult {
  token: string;
  expiresAt: string;
}

@Injectable()
export class CreateEmbedTokenCommandHandler {
  constructor(
    @Inject(WHITE_LABEL_CONFIG_REPOSITORY)
    private readonly whiteLabelRepository: IWhiteLabelConfigRepository,
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userRepository: UserAccountRepository,
    @Inject(EMBED_TOKEN_SERVICE)
    private readonly embedTokens: IEmbedTokenService,
  ) {}

  async execute(
    command: CreateEmbedTokenCommand,
  ): Promise<Result<CreateEmbedTokenResult, DomainError>> {
    // 1. Check embed enabled (order matters: no leak de existencia)
    const configResult = await this.whiteLabelRepository.findByCompanyId(
      command.companyId,
    );
    if (configResult.isErr() || !configResult.unwrap().embedEnabled) {
      return err(new EmbedTokenForbiddenError('EMBED_DISABLED_FOR_TENANT'));
    }

    // 2. Verify user exists and belongs to the company
    const user = await this.userRepository.findById(command.userId);
    if (!user || user.companyId.value !== command.companyId) {
      return err(new EmbedTokenForbiddenError('EMBED_USER_NOT_IN_TENANT'));
    }

    // 3. Issue the token (pass user's roles to EmbedTokenService)
    const roles = user.roles.toPrimitives();
    const tokenResult = await this.embedTokens.createToken(
      command.companyId,
      command.userId,
      roles,
    );
    if (tokenResult.isErr()) {
      const errValue = tokenResult.error;
      // Propagate as-is; if it's an EmbedTokenError we keep it; otherwise
      // wrap so the caller can still treat it as a domain error.
      return err(
        errValue instanceof EmbedTokenError ||
          errValue instanceof EmbedTokenForbiddenError
          ? errValue
          : new EmbedTokenError(errValue.message),
      );
    }

    const issued = tokenResult.unwrap();
    return ok({
      token: issued.token,
      expiresAt: issued.expiresAt,
    });
  }
}
