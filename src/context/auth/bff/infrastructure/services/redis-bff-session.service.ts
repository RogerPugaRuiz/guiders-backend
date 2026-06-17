/**
 * Implementación Redis del BffSessionService (Story 2.1, Task 2.3).
 *
 * Storage:
 * - Key:   `bff:session:<sessionId>` (256-bit base64url, 43 chars)
 * - Value: JSON { userId, companyId, roles[], createdAt, embedTokenRef, expiresAt }
 * - TTL:   8h (28800 segundos) — mirror del TTL del embed token
 *
 * El cliente Redis se inicializa en onModuleInit y se libera en
 * onModuleDestroy. Sigue el patrón establecido por
 * `RedisEmbedTokenService` (Story 1.2). Cada servicio crea su propio
 * cliente ioredis (tech debt F10: cliente compartido en el futuro).
 *
 * A diferencia de `EmbedTokenService`, este servicio NO usa Lua ni
 * operaciones atómicas: `createSession` es un `SET EX` simple, y
 * `revokeSession` es un `DEL` simple. La atomicidad de refresh no
 * aplica aquí (la BFF session no se refresca — se reemplaza por
 * una nueva cada vez que el iframe llama authenticate-session).
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { randomBytes } from 'crypto';
import { Result, ok, err, okVoid } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  IBffSessionService,
  BffSessionIssued,
} from '../../domain/services/bff-session.service';
import {
  BffSessionInvalidFormatError,
  BffSessionNotFoundError,
  BffSessionCorruptedError,
  BffSessionServiceUnavailableError,
  BffSessionError,
} from '../../domain/errors/bff-session.errors';
import {
  BffSessionData,
  BFF_SESSION_KEY_PREFIX,
  BFF_SESSION_TTL_SECONDS,
} from '../../domain/value-objects/bff-session-data';

const BASE64URL_REGEX = /^[A-Za-z0-9_-]{43}$/;
const MAX_ROLES = 64;
const MAX_STRING_LENGTH = 256;
const MAX_JSON_LENGTH = 8 * 1024; // 8KB

@Injectable()
export class RedisBffSessionService
  implements IBffSessionService, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisBffSessionService.name);
  private client: RedisClientType;

  /**
   * @param clientOverride Redis client to use instead of creating one. **@internal**
   *   Solo para tests. En producción NestJS no inyecta este parámetro —
   *   `this.client` se crea en `onModuleInit`.
   */
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
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
      },
    });
    this.client.on('error', (err) =>
      this.logger.error('Error en cliente Redis bff sessions', err),
    );
    await this.client.connect();
    this.logger.log('Cliente Redis bff sessions inicializado');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error desconocido';
        this.logger.warn(
          `Error al cerrar cliente Redis bff sessions: ${message}`,
        );
      }
      // F3 (code review Story 2.1): reset client so onModuleInit reconnects
      // on hot reload. Without this, `if (this.client) return;` short-circuits
      // and the service keeps a closed client → 503 lockout until full restart.
      this.client = undefined as unknown as RedisClientType;
    }
  }

  async createSession(
    data: Omit<BffSessionData, 'embedTokenRef' | 'expiresAt'>,
    embedTokenRef: string,
  ): Promise<Result<BffSessionIssued, DomainError>> {
    // 1. Validar inputs
    const validationError = this.validateSessionData(data, embedTokenRef);
    if (validationError) {
      return err(validationError);
    }

    // 2. Generar sessionId opaco (256 bits, base64url → 43 chars)
    const sessionId = randomBytes(32).toString('base64url');
    if (!BASE64URL_REGEX.test(sessionId)) {
      // Probabilidad ~0, pero por seguridad validamos
      return err(
        new BffSessionServiceUnavailableError(
          'No se pudo generar un sessionId con formato válido',
        ),
      );
    }

    // 3. Calcular expiresAt
    const expiresAt = new Date(
      Date.now() + BFF_SESSION_TTL_SECONDS * 1000,
    ).toISOString();

    // 4. Serializar value
    const value: BffSessionData = {
      ...data,
      embedTokenRef,
      expiresAt,
    };
    const serialized = JSON.stringify(value);

    // 5. SET EX en Redis
    try {
      await this.client.set(
        `${BFF_SESSION_KEY_PREFIX}${sessionId}`,
        serialized,
        { EX: BFF_SESSION_TTL_SECONDS },
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error desconocido';
      this.logger.error(`Error al crear BFF session en Redis: ${message}`);
      return err(new BffSessionServiceUnavailableError(message));
    }

    return ok({ sessionId, expiresAt });
  }

  async getSession(
    sessionId: string,
  ): Promise<Result<BffSessionData, DomainError>> {
    // 1. Validar formato del sessionId
    if (!BASE64URL_REGEX.test(sessionId)) {
      return err(new BffSessionInvalidFormatError());
    }

    // 2. GET en Redis
    let raw: string | null;
    try {
      raw = await this.client.get(`${BFF_SESSION_KEY_PREFIX}${sessionId}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error desconocido';
      this.logger.error(`Error al leer BFF session de Redis: ${message}`);
      return err(new BffSessionServiceUnavailableError(message));
    }

    // 3. Si no existe, retornar NotFoundError
    if (raw === null) {
      return err(new BffSessionNotFoundError(sessionId.substring(0, 8)));
    }

    // 4. Parsear JSON y validar shape
    let parsed: BffSessionData;
    try {
      parsed = JSON.parse(raw) as BffSessionData;
    } catch {
      return err(new BffSessionCorruptedError());
    }

    const corruptionError = this.validateStoredData(parsed);
    if (corruptionError) {
      return err(corruptionError);
    }

    return ok(parsed);
  }

  async revokeSession(sessionId: string): Promise<Result<void, DomainError>> {
    if (!BASE64URL_REGEX.test(sessionId)) {
      return err(new BffSessionInvalidFormatError());
    }

    // E9 (code review Story 2.1): revokeSession es idempotente por contrato.
    // Si Redis está down, el session expira por TTL (8h) igualmente, así que
    // no retornamos 503 — loggeamos WARN y retornamos ok. Coincide con el
    // patrón de `RedisEmbedTokenService.revokeToken` (Story 1.2).
    try {
      await this.client.del(`${BFF_SESSION_KEY_PREFIX}${sessionId}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error desconocido';
      this.logger.warn(
        `No se pudo revocar BFF session en Redis (idempotente, TTL hará efecto): ${message}`,
      );
    }

    return okVoid();
  }

  /**
   * Valida los inputs de createSession. Retorna el error si
   * algo no cumple, o `null` si todo OK.
   */
  private validateSessionData(
    data: Omit<BffSessionData, 'embedTokenRef' | 'expiresAt'>,
    embedTokenRef: string,
  ): DomainError | null {
    if (!data.userId || data.userId.length === 0) {
      return new BffSessionError('userId no puede estar vacío');
    }
    if (data.userId.length > MAX_STRING_LENGTH) {
      return new BffSessionError(
        `userId excede el máximo de ${MAX_STRING_LENGTH} chars`,
      );
    }
    if (!data.companyId || data.companyId.length === 0) {
      return new BffSessionError('companyId no puede estar vacío');
    }
    if (data.companyId.length > MAX_STRING_LENGTH) {
      return new BffSessionError(
        `companyId excede el máximo de ${MAX_STRING_LENGTH} chars`,
      );
    }
    if (!Array.isArray(data.roles) || data.roles.length === 0) {
      return new BffSessionError('roles no puede estar vacío');
    }
    if (data.roles.length > MAX_ROLES) {
      return new BffSessionError(
        `roles excede el máximo de ${MAX_ROLES} elementos`,
      );
    }
    for (const role of data.roles) {
      if (typeof role !== 'string' || role.length === 0) {
        return new BffSessionError('cada rol debe ser un string no vacío');
      }
      if (role.length > MAX_STRING_LENGTH) {
        return new BffSessionError(
          `rol excede el máximo de ${MAX_STRING_LENGTH} chars`,
        );
      }
    }
    if (!data.createdAt || typeof data.createdAt !== 'string') {
      return new BffSessionError('createdAt debe ser un ISO 8601 string');
    }
    if (!embedTokenRef || embedTokenRef.length === 0) {
      return new BffSessionError('embedTokenRef no puede estar vacío');
    }

    // Validar tamaño del JSON serializado
    const serialized = JSON.stringify({ ...data, embedTokenRef });
    if (serialized.length > MAX_JSON_LENGTH) {
      return new BffSessionError(
        `JSON serializado excede el máximo de ${MAX_JSON_LENGTH} bytes`,
      );
    }

    return null;
  }

  /**
   * Valida que el JSON almacenado en Redis tenga la shape esperada.
   * Detecta corrupción / incompatibilidad de versiones.
   */
  private validateStoredData(data: unknown): DomainError | null {
    if (typeof data !== 'object' || data === null) {
      return new BffSessionCorruptedError();
    }
    const d = data as Record<string, unknown>;
    if (typeof d.userId !== 'string' || d.userId.length === 0) {
      return new BffSessionCorruptedError();
    }
    if (typeof d.companyId !== 'string' || d.companyId.length === 0) {
      return new BffSessionCorruptedError();
    }
    if (
      !Array.isArray(d.roles) ||
      d.roles.length === 0 ||
      !d.roles.every((r) => typeof r === 'string')
    ) {
      return new BffSessionCorruptedError();
    }
    if (typeof d.createdAt !== 'string') {
      return new BffSessionCorruptedError();
    }
    if (typeof d.embedTokenRef !== 'string') {
      return new BffSessionCorruptedError();
    }
    return null;
  }
}
