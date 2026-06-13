/**
 * Tests del servicio Redis-backed EmbedTokenService (Story 1.2).
 *
 * Estrategia: mock del cliente Redis con InMemoryRedisClient (Map-based)
 * que simula las operaciones que el servicio necesita: get, set, del,
 * multi/exec, expire. Captura regresiones en la lógica de tokens opacos
 * y aislamiento por namespace.
 */

import { RedisEmbedTokenService } from '../redis-embed-token.service';
import { EmbedTokenNotFoundError } from '../../../domain/errors/embed-token.errors';
import { EMBED_TOKEN_SERVICE } from '../../../domain/services/embed-token.service';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

/**
 * Mock in-memory del cliente Redis. Simula la API del `redis` lib que
 * el servicio usa: get, set, del, multi+exec+expire.
 */
class InMemoryRedisClient {
  public store = new Map<string, string>();
  public sets = new Map<
    string,
    { key: string; value?: string; ttl?: number }[]
  >();
  public execLog: string[] = [];

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(
    key: string,
    value: string,
    options?: { EX?: number },
  ): Promise<'OK' | null> {
    this.store.set(key, value);
    if (options?.EX !== undefined) {
      // Simula EX con TTL interno (no expira realmente, solo almacena el TTL)
      this.store.set(`${key}:__ttl`, String(options.EX));
    }
    this.execLog.push(
      `SET ${key} ${value.substring(0, 20)}... EX ${options?.EX ?? ''}`,
    );
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const had = this.store.delete(key) ? 1 : 0;
    this.store.delete(`${key}:__ttl`);
    this.execLog.push(`DEL ${key}`);
    return had;
  }

  multi() {
    const ops: { method: string; args: unknown[] }[] = [];
    const self = this;
    const chain = {
      set(key: string, value: string) {
        ops.push({ method: 'set', args: [key, value] });
        return chain;
      },
      expire(key: string, seconds: number) {
        ops.push({ method: 'expire', args: [key, seconds] });
        return chain;
      },
      del(key: string) {
        ops.push({ method: 'del', args: [key] });
        return chain;
      },
      async exec(): Promise<unknown[]> {
        for (const op of ops) {
          if (op.method === 'set') {
            await self.set(op.args[0] as string, op.args[1] as string);
          } else if (op.method === 'expire') {
            const key = op.args[0] as string;
            const seconds = op.args[1] as number;
            self.store.set(`${key}:__ttl`, String(seconds));
          } else if (op.method === 'del') {
            await self.del(op.args[0] as string);
          }
        }
        return ops.map(() => 'OK');
      },
    };
    return chain;
  }

  async quit(): Promise<'OK'> {
    return 'OK';
  }

  async connect(): Promise<void> {
    // no-op
  }
}

describe('RedisEmbedTokenService - Story 1.2 (unit)', () => {
  let client: InMemoryRedisClient;
  let service: RedisEmbedTokenService;

  beforeEach(async () => {
    client = new InMemoryRedisClient();
    service = new RedisEmbedTokenService(
      client as unknown as ConstructorParameters<
        typeof RedisEmbedTokenService
      >[0],
    );
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('createToken', () => {
    it('debería retornar un token de 43 caracteres en formato base64url', async () => {
      const companyId = Uuid.random().value;
      const userId = Uuid.random().value;
      const roles = ['admin', 'commercial'];

      const result = await service.createToken(companyId, userId, roles);

      expect(result.isOk()).toBe(true);
      const { token, expiresAt } = result.unwrap();
      expect(token).toHaveLength(43);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/); // base64url sin + / =
    });

    it('debería almacenar el token en Redis con prefijo embed:token: y TTL 28800', async () => {
      const companyId = Uuid.random().value;
      const userId = Uuid.random().value;
      const roles = ['admin'];

      const result = await service.createToken(companyId, userId, roles);
      const { token } = result.unwrap();
      const key = `embed:token:${token}`;

      const stored = client.store.get(key);
      expect(stored).toBeDefined();
      expect(client.store.get(`${key}:__ttl`)).toBe('28800');
    });

    it('debería almacenar JSON con userId, companyId, roles, createdAt', async () => {
      const companyId = Uuid.random().value;
      const userId = Uuid.random().value;
      const roles = ['admin', 'supervisor'];

      const result = await service.createToken(companyId, userId, roles);
      const { token } = result.unwrap();
      const stored = JSON.parse(
        client.store.get(`embed:token:${token}`) as string,
      );

      expect(stored.userId).toBe(userId);
      expect(stored.companyId).toBe(companyId);
      expect(stored.roles).toEqual(roles);
      expect(stored.createdAt).toBeDefined();
    });

    it('debería retornar expiresAt como ISOString en el futuro (~8h)', async () => {
      const before = Date.now();
      const result = await service.createToken(
        Uuid.random().value,
        Uuid.random().value,
        ['admin'],
      );
      const after = Date.now();
      const { expiresAt } = result.unwrap();

      const expiresAtMs = new Date(expiresAt).getTime();
      const eightHoursMs = 8 * 60 * 60 * 1000;

      // expiresAt debe ser ~8h en el futuro (con margen de 5 segundos por jitter)
      expect(expiresAtMs).toBeGreaterThanOrEqual(before + eightHoursMs - 5000);
      expect(expiresAtMs).toBeLessThanOrEqual(after + eightHoursMs + 5000);
    });

    it('debería generar tokens únicos en cada llamada', async () => {
      const tokens = await Promise.all(
        Array.from({ length: 10 }, () =>
          service.createToken(Uuid.random().value, Uuid.random().value, [
            'admin',
          ]),
        ),
      );

      const tokenValues = tokens.map((r) => r.unwrap().token);
      const unique = new Set(tokenValues);
      expect(unique.size).toBe(10);
    });
  });

  describe('validateToken', () => {
    it('debería retornar los datos del token cuando existe', async () => {
      const companyId = Uuid.random().value;
      const userId = Uuid.random().value;
      const roles = ['commercial'];

      const created = await service.createToken(companyId, userId, roles);
      const { token } = created.unwrap();

      const result = await service.validateToken(token);

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.userId).toBe(userId);
      expect(data.companyId).toBe(companyId);
      expect(data.roles).toEqual(roles);
    });

    it('debería retornar err(EmbedTokenNotFoundError) si el token no existe', async () => {
      const fakeToken = 'a'.repeat(43);

      const result = await service.validateToken(fakeToken);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(EmbedTokenNotFoundError);
      }
    });

    it('debería retornar err si el JSON almacenado está malformado', async () => {
      const fakeToken = 'b'.repeat(43);
      client.store.set(`embed:token:${fakeToken}`, 'not-valid-json{');

      const result = await service.validateToken(fakeToken);

      expect(result.isErr()).toBe(true);
    });

    it('debería retornar err si el token tiene formato inválido (longitud incorrecta)', async () => {
      const result = await service.validateToken('short');

      expect(result.isErr()).toBe(true);
    });
  });

  describe('refreshToken', () => {
    it('debería generar un nuevo token, eliminar el viejo y devolver el nuevo', async () => {
      const oldResult = await service.createToken(
        Uuid.random().value,
        Uuid.random().value,
        ['admin'],
      );
      const oldToken = oldResult.unwrap().token;

      const refreshResult = await service.refreshToken(oldToken);

      expect(refreshResult.isOk()).toBe(true);
      const { token: newToken, expiresAt } = refreshResult.unwrap();
      expect(newToken).not.toBe(oldToken);
      expect(newToken).toHaveLength(43);
      expect(expiresAt).toBeDefined();

      // El viejo debe estar eliminado
      const oldStored = client.store.get(`embed:token:${oldToken}`);
      expect(oldStored).toBeUndefined();

      // El nuevo debe existir
      const newStored = client.store.get(`embed:token:${newToken}`);
      expect(newStored).toBeDefined();
    });

    it('debería preservar los datos (userId, companyId, roles) en el refresh', async () => {
      const companyId = Uuid.random().value;
      const userId = Uuid.random().value;
      const roles = ['supervisor'];

      const oldResult = await service.createToken(companyId, userId, roles);
      const oldToken = oldResult.unwrap().token;

      const refreshResult = await service.refreshToken(oldToken);
      const { token: newToken } = refreshResult.unwrap();

      const validateResult = await service.validateToken(newToken);
      const data = validateResult.unwrap();
      expect(data.userId).toBe(userId);
      expect(data.companyId).toBe(companyId);
      expect(data.roles).toEqual(roles);
    });

    it('debería retornar err si el token viejo no existe', async () => {
      const result = await service.refreshToken('a'.repeat(43));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(EmbedTokenNotFoundError);
      }
    });
  });

  describe('revokeToken', () => {
    it('debería eliminar el token de Redis', async () => {
      const created = await service.createToken(
        Uuid.random().value,
        Uuid.random().value,
        ['admin'],
      );
      const { token } = created.unwrap();
      expect(client.store.get(`embed:token:${token}`)).toBeDefined();

      const revokeResult = await service.revokeToken(token);

      expect(revokeResult.isOk()).toBe(true);
      expect(client.store.get(`embed:token:${token}`)).toBeUndefined();
    });

    it('debería hacer que validateToken retorne err después de revocar', async () => {
      const created = await service.createToken(
        Uuid.random().value,
        Uuid.random().value,
        ['admin'],
      );
      const { token } = created.unwrap();

      await service.revokeToken(token);
      const result = await service.validateToken(token);

      expect(result.isErr()).toBe(true);
    });

    it('debería retornar ok incluso si el token no existe (idempotente)', async () => {
      const result = await service.revokeToken('nonexistent'.padEnd(43, 'x'));
      expect(result.isOk()).toBe(true);
    });
  });

  describe('Symbol DI', () => {
    it('EMBED_TOKEN_SERVICE debe estar exportado como Symbol', () => {
      expect(typeof EMBED_TOKEN_SERVICE).toBe('symbol');
    });
  });
});
