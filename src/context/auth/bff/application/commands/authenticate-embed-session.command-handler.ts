/**
 * Command handler que orquesta la creación de una BFF session a
 * partir de un embed token validado.
 *
 * Flujo (3 pasos):
 *  1. Valida el embed token contra Redis via `EmbedTokenService.validateToken`.
 *     Si es `NotFound`/`InvalidFormat`/`Corrupted`/`Error` → propaga.
 *  2. Defense-in-depth: si el body trae `userId`/`companyId` y difieren
 *     del token → retorna `EmbedBodyTokenMismatchError` (403).
 *  3. Crea la BFF session via `BffSessionService.createSession`.
 *     El `embedTokenRef` se guarda en Redis para trazabilidad y
 *     revocación en cascada (Story 2.3).
 *
 * Cualquier fallo se propaga al controller, que mapea a HTTP 401/403/503.
 */

import { Inject, Injectable } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  EMBED_TOKEN_SERVICE,
  IEmbedTokenService,
} from 'src/context/auth/integration-api-key/domain/services/embed-token.service';
import {
  BFF_SESSION_SERVICE,
  IBffSessionService,
  BffSessionIssued,
} from '../../domain/services/bff-session.service';
import { EmbedBodyTokenMismatchError } from '../../domain/errors/bff-session.errors';
import { AuthenticateEmbedSessionCommand } from './authenticate-embed-session.command';

@Injectable()
export class AuthenticateEmbedSessionCommandHandler {
  constructor(
    @Inject(EMBED_TOKEN_SERVICE)
    private readonly embedTokens: IEmbedTokenService,
    @Inject(BFF_SESSION_SERVICE)
    private readonly bffSessions: IBffSessionService,
  ) {}

  async execute(
    command: AuthenticateEmbedSessionCommand,
  ): Promise<Result<BffSessionIssued, DomainError>> {
    // 1. Validar el embed token contra Redis
    const tokenData = await this.embedTokens.validateToken(command.embedToken);
    if (tokenData.isErr()) {
      // Propaga el error tal cual — el controller mapea a HTTP 401/503
      return err(tokenData.error);
    }

    const data = tokenData.unwrap();

    // 2. Defense-in-depth: body userId/companyId deben matchear el token
    if (
      command.expectedUserId !== undefined &&
      command.expectedUserId !== data.userId
    ) {
      return err(new EmbedBodyTokenMismatchError());
    }
    if (
      command.expectedCompanyId !== undefined &&
      command.expectedCompanyId !== data.companyId
    ) {
      return err(new EmbedBodyTokenMismatchError());
    }

    // 3. Crear la BFF session con el embedTokenRef para trazabilidad
    const sessionResult = await this.bffSessions.createSession(
      {
        userId: data.userId,
        companyId: data.companyId,
        roles: data.roles,
        createdAt: data.createdAt,
      },
      command.embedToken,
    );

    if (sessionResult.isErr()) {
      return err(sessionResult.error);
    }

    return ok(sessionResult.unwrap());
  }
}
