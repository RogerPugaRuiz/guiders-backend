/**
 * Command handler que orquesta la revocación en cascada de una BFF
 * session y su embed token padre.
 *
 * Flujo (4 pasos):
 *  1. Lee la BFF session de Redis via `BffSessionService.getSession`.
 *     Si no existe → retorna err(BffSessionNotFoundError) + emite failure event.
 *  2. Extrae `embedTokenRef` de la session.
 *  3. Borra la BFF session via `BffSessionService.revokeSession`.
 *  4. Borra el embed token via `EmbedTokenService.revokeToken`.
 *     Si el token ya no existe (race con refresh) → se considera PARTIAL.
 *
 * Story 2.2: emite eventos al bus para el audit log.
 * TA-4: SIEMPRE usa `tryPublish` (no propaga excepciones del bus).
 *
 * Casos de resultado (LogoutCascadeResult):
 *   SUCCESS   - ambos DELs retornaron 1
 *   PARTIAL   - BFF session borrada, embed token ya no existía
 *   NOT_FOUND - BFF session no existía al momento del logout (idempotencia)
 *   FAILURE   - error de Redis irrecuperable
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  EMBED_TOKEN_SERVICE,
  IEmbedTokenService,
} from 'src/context/auth/integration-api-key/domain/services/embed-token.service';
import {
  BFF_SESSION_SERVICE,
  IBffSessionService,
} from '../../domain/services/bff-session.service';
import {
  BffSessionNotFoundError,
  BffSessionServiceUnavailableError,
} from '../../domain/errors/bff-session.errors';
import { EmbedTokenNotFoundError } from 'src/context/auth/integration-api-key/domain/errors/embed-token.errors';
import { EmbedTokenAuthenticatedEvent } from 'src/context/auth/integration-api-key/domain/events/embed-token-authenticated.event';
import { EmbedTokenAuthenticationFailedEvent } from 'src/context/auth/integration-api-key/domain/events/embed-token-authentication-failed.event';
import { EmbedAuthFailureReason } from 'src/context/auth/integration-api-key/domain/events/embed-auth-failure-reason.enum';
import { tryPublish } from 'src/context/shared/events/try-publish';
import { LogoutCascadeResultValue } from '../../domain/value-objects/logout-cascade-result';
import { LogoutCommand } from './logout.command';

export interface LogoutCommandResult {
  cascadingResult: LogoutCascadeResultValue;
  sessionId: string;
  embedTokenRevoked: boolean;
}

@Injectable()
export class LogoutCommandHandler {
  private readonly logger = new Logger(LogoutCommandHandler.name);

  constructor(
    @Inject(BFF_SESSION_SERVICE)
    private readonly bffSessions: IBffSessionService,
    @Inject(EMBED_TOKEN_SERVICE)
    private readonly embedTokens: IEmbedTokenService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: LogoutCommand,
  ): Promise<Result<LogoutCommandResult, DomainError>> {
    const now = () => new Date().toISOString();

    const publishFailure = (
      reason: EmbedAuthFailureReason,
      detail: string,
      userId: string | null = null,
      companyId: string | null = null,
    ) => {
      tryPublish(
        this.eventBus,
        new EmbedTokenAuthenticationFailedEvent({
          companyId: companyId ?? 'unknown',
          userId,
          origin: command.origin,
          timestamp: now(),
          ipAddress: command.ipAddress,
          userAgent: command.userAgent,
          endpoint: '/bff/auth/logout',
          failureReason: reason,
          failureDetail: detail,
        }),
        this.logger,
        'logout',
      );
    };

    // 1. Leer la BFF session de Redis
    const sessionResult = await this.bffSessions.getSession(command.sessionId);

    if (sessionResult.isErr()) {
      const errValue = sessionResult.error;
      if (errValue instanceof BffSessionNotFoundError) {
        // Idempotente: session no existe, no hay nada que borrar.
        // Emitir failure event para audit (soporte puede alertar sobre
        // logout attempts con sesiones inexistentes = posible ataque).
        publishFailure(
          EmbedAuthFailureReason.EMBED_SESSION_NOT_FOUND,
          `BFF session no encontrada: ${command.sessionId.slice(0, 8)}...`,
        );
        return err(errValue);
      }
      if (errValue instanceof BffSessionServiceUnavailableError) {
        publishFailure(
          EmbedAuthFailureReason.EMBED_SERVICE_UNAVAILABLE,
          errValue.message,
        );
        return err(errValue);
      }
      // Error no clasificado
      publishFailure(EmbedAuthFailureReason.UNKNOWN_ERROR, errValue.message);
      return err(errValue);
    }

    const session = sessionResult.unwrap();
    const embedTokenRef = session.embedTokenRef;

    // 2. Borrar la BFF session
    const revokeSessionResult = await this.bffSessions.revokeSession(
      command.sessionId,
    );

    if (revokeSessionResult.isErr()) {
      const errValue = revokeSessionResult.error;
      publishFailure(
        EmbedAuthFailureReason.EMBED_SERVICE_UNAVAILABLE,
        `Error al revocar BFF session: ${errValue.message}`,
        session.userId,
        session.companyId,
      );
      return err(errValue);
    }

    // 3. Borrar el embed token padre (si existe)
    let embedTokenRevoked = true;
    let cascadingResult = LogoutCascadeResultValue.success();
    let failureDetail: string | undefined;

    if (embedTokenRef) {
      const revokeTokenResult =
        await this.embedTokens.revokeToken(embedTokenRef);

      if (revokeTokenResult.isErr()) {
        const errValue = revokeTokenResult.error;
        if (errValue instanceof EmbedTokenNotFoundError) {
          // Race condition: token ya no existe (refresh o revoke previo).
          // Se considera PARTIAL — la revocación del BFF session fue OK,
          // pero el embed token ya no estaba. Audit registra para análisis.
          embedTokenRevoked = false;
          cascadingResult = LogoutCascadeResultValue.partial();
          failureDetail =
            'token already revoked (race condition with refresh or previous revoke)';
        } else {
          // Error irrecuperable del embed token (Redis down, etc.)
          publishFailure(
            EmbedAuthFailureReason.EMBED_SERVICE_UNAVAILABLE,
            `Error al revocar embed token: ${errValue.message}`,
            session.userId,
            session.companyId,
          );
          return err(errValue);
        }
      }
    }

    // 4. Emitir evento de éxito al audit log
    tryPublish(
      this.eventBus,
      new EmbedTokenAuthenticatedEvent({
        companyId: session.companyId,
        userId: session.userId,
        origin: command.origin,
        timestamp: now(),
        ipAddress: command.ipAddress,
        userAgent: command.userAgent,
        endpoint: '/bff/auth/logout',
        logoutTimestamp: now(),
        cascadingResult: cascadingResult.toJSON(),
        embedTokenRevoked,
        failureDetail,
      }),
      this.logger,
      'logout',
    );

    return ok({
      cascadingResult,
      sessionId: command.sessionId,
      embedTokenRevoked,
    });
  }
}
