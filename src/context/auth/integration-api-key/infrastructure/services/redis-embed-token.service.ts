/**
 * Implementación Redis del EmbedTokenService.
 *
 * Storage:
 * - Key:   `embed:token:<token>` (256-bit base64url, 43 chars)
 * - Value: JSON { userId, companyId, roles[], createdAt }
 * - TTL:   8h (28800 segundos)
 *
 * El cliente Redis se inicializa en onModuleInit y se libera en
 * onModuleDestroy. Sigue el patrón establecido por
 * `redis-visitor-connection.domain-service.ts`.
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { randomBytes } from 'crypto';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { IEmbedTokenService } from '../../domain/services/embed-token.service';
import {
  EmbedTokenNotFoundError,
  EmbedTokenError,
} from '../../domain/errors/embed-token.errors';
import {
  EmbedTokenData,
  EmbedTokenIssued,
} from '../../domain/value-objects/embed-token-data';

@Injectable()
export class RedisEmbedTokenService
  implements IEmbedTokenService, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisEmbedTokenService.name);
  private client: RedisClientType;

  private readonly PREFIX = 'embed:token:';
  private readonly TTL_SECONDS = 8 * 60 * 60; // 8 horas
  private readonly TOKEN_BYTES = 32; // 256 bits

  constructor(clientOverride?: RedisClientType) {
    if (clientOverride) {
      this.client = clientOverride;
    }
  }

  async onModuleInit(): Promise<void> {
    if (this.client) {
      return;
    }
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    this.client.on('error', (err) =>
      this.logger.error('Error en cliente Redis embed tokens', err),
    );
    await this.client.connect();
    this.logger.log('Cliente Redis embed tokens inicializado');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }

  private key(token: string): string {
    return `${this.PREFIX}${token}`;
  }

  async createToken(
    companyId: string,
    userId: string,
    roles: string[],
  ): Promise<Result<EmbedTokenIssued, DomainError>> {
    try {
      const token = randomBytes(this.TOKEN_BYTES).toString('base64url');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.TTL_SECONDS * 1000);

      const data: EmbedTokenData = {
        userId,
        companyId,
        roles,
        createdAt: now.toISOString(),
      };

      await this.client.set(this.key(token), JSON.stringify(data), {
        EX: this.TTL_SECONDS,
      });

      this.logger.debug(
        `Embed token emitido para companyId=${companyId} userId=${userId}`,
      );

      return ok({
        token,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al crear embed token: ${message}`);
      return err(new EmbedTokenError(`Error al crear embed token: ${message}`));
    }
  }

  async validateToken(
    token: string,
  ): Promise<Result<EmbedTokenData, DomainError>> {
    if (!token || typeof token !== 'string' || token.length !== 43) {
      return err(
        new EmbedTokenNotFoundError(token?.substring(0, 8) ?? 'invalid'),
      );
    }

    try {
      const raw = await this.client.get(this.key(token));
      if (!raw) {
        return err(new EmbedTokenNotFoundError(token.substring(0, 8)));
      }

      const data = JSON.parse(raw) as EmbedTokenData;
      return ok(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al validar embed token: ${message}`);
      return err(
        new EmbedTokenError(`Error al validar embed token: ${message}`),
      );
    }
  }

  async refreshToken(
    oldToken: string,
  ): Promise<Result<EmbedTokenIssued, DomainError>> {
    const oldData = await this.validateToken(oldToken);
    if (oldData.isErr()) {
      return err(oldData.error);
    }

    try {
      const newToken = randomBytes(this.TOKEN_BYTES).toString('base64url');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.TTL_SECONDS * 1000);

      const newData: EmbedTokenData = {
        userId: oldData.unwrap().userId,
        companyId: oldData.unwrap().companyId,
        roles: oldData.unwrap().roles,
        createdAt: now.toISOString(),
      };

      // Atomic: DEL old + SET new con TTL via MULTI
      await this.client
        .multi()
        .del(this.key(oldToken))
        .set(this.key(newToken), JSON.stringify(newData))
        .expire(this.key(newToken), this.TTL_SECONDS)
        .exec();

      this.logger.debug(
        `Embed token refrescado: ${oldToken.substring(0, 8)}... → ${newToken.substring(0, 8)}...`,
      );

      return ok({
        token: newToken,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al refrescar embed token: ${message}`);
      return err(
        new EmbedTokenError(`Error al refrescar embed token: ${message}`),
      );
    }
  }

  async revokeToken(token: string): Promise<Result<void, DomainError>> {
    try {
      await this.client.del(this.key(token));
      this.logger.debug(
        `Embed token revocado: ${token?.substring(0, 8) ?? 'invalid'}...`,
      );
      return ok(undefined);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al revocar embed token: ${message}`);
      return err(
        new EmbedTokenError(`Error al revocar embed token: ${message}`),
      );
    }
  }
}
