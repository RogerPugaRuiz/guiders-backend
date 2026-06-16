/**
 * Tests del servicio Redis-backed BffSessionService (Story 2.1, Task 2.3).
 *
 * Estrategia: mock del cliente Redis con InMemoryRedisClient (Map-based)
 * que simula get, set, del, quit. Captura regresiones en la lógica
 * de sessions opacas y aislamiento por namespace `bff:session:`.
 *
 * Estos tests deben fallar (RED) hasta que Task 2.3 implemente
 * `RedisBffSessionService`.
 */

import { RedisBffSessionService } from '../redis-bff-session.service';
import {
  BffSessionNotFoundError,
  BffSessionInvalidFormatError,
  BffSessionCorruptedError,
  BffSessionServiceUnavailableError,
} from '../../../domain/errors/bff-session.errors';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

/**
 * Mock in-memory del cliente Redis. Simula la API del `redis` lib que
 * el servicio usa: get, set, del, quit. No implementa Lua ni multi/expire
 * porque `BffSessionService` no los necesita (no hay refresh atómico).
 */
class InMemoryRedisClient {
  public store = new Map<string, string>();
  public execLog: string[] = [];

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.store.get(key) ?? null);
  }

  set(
    key: string,
    value: string,
    options?: { EX?: number },
  ): Promise<'OK' | null> {
    this.store.set(key, value);
    if (options?.EX !== undefined) {
      this.store.set(`${key}:__ttl`, String(options.EX));
    }
    this.execLog.push(
      `SET ${key} ${value.substring(0, 20)}... EX ${options?.EX ?? ''}`,
    );
    return Promise.resolve('OK');
  }

  del(key: string): Promise<number> {
    const had = this.store.delete(key) ? 1 : 0;
    this.store.delete(`${key}:__ttl`);
    this.execLog.push(`DEL ${key}`);
    return Promise.resolve(had);
  }

  quit(): Promise<'OK'> {
    return Promise.resolve('OK');
  }

  async connect(): Promise<void> {
    // no-op
  }

  on(_event: string, _handler: (...args: unknown[]) => void): void {
    // no-op for mocking
  }
}

describe('RedisBffSessionService - Story 2.1 (unit)', () => {
  let client: InMemoryRedisClient;
  let service: RedisBffSessionService;

  beforeEach(async () => {
    client = new InMemoryRedisClient();
    service = new RedisBffSessionService(
      client as unknown as ConstructorParameters<
        typeof RedisBffSessionService
      >[0],
    );
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('createSession', () => {
    it('debe generar un sessionId de 43 caracteres en formato base64url', async () => {
      const data = {
        userId: Uuid.random().value,
        companyId: Uuid.random().value,
        roles: ['admin'],
        createdAt: new Date().toISOString(),
        embedTokenRef: 'X'.repeat(43),
      };

      const result = await service.createSession(data, 'X'.repeat(43));

      expect(result.isOk()).toBe(true);
      const { sessionId } = result.unwrap();
      expect(sessionId).toHaveLength(43);
      expect(sessionId).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('debe almacenar la session en Redis con prefijo bff:session: y TTL 28800', async () => {
      const data = {
        userId: Uuid.random().value,
        companyId: Uuid.random().value,
        roles: ['admin'],
        createdAt: new Date().toISOString(),
        embedTokenRef: 'X'.repeat(43),
      };

      const result = await service.createSession(data, 'X'.repeat(43));
      const { sessionId } = result.unwrap();
      const key = `bff:session:${sessionId}`;

      const stored = client.store.get(key);
      expect(stored).toBeDefined();
      expect(client.store.get(`${key}:__ttl`)).toBe('28800');
    });

    it('debe almacenar JSON con userId, companyId, roles, createdAt, embedTokenRef', async () => {
      const userId = Uuid.random().value;
      const companyId = Uuid.random().value;
      const createdAt = new Date().toISOString();
      const embedTokenRef = 'Y'.repeat(43);
      const data = {
        userId,
        companyId,
        roles: ['admin', 'commercial'],
        createdAt,
        embedTokenRef,
      };

      const result = await service.createSession(data, embedTokenRef);
      const { sessionId } = result.unwrap();
      const stored = client.store.get(`bff:session:${sessionId}`);
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      expect(parsed.userId).toBe(userId);
      expect(parsed.companyId).toBe(companyId);
      expect(parsed.roles).toEqual(['admin', 'commercial']);
      expect(parsed.createdAt).toBe(createdAt);
      expect(parsed.embedTokenRef).toBe(embedTokenRef);
    });

    it('debe rechazar userId vacío', async () => {
      const data = {
        userId: '',
        companyId: Uuid.random().value,
        roles: ['admin'],
        createdAt: new Date().toISOString(),
        embedTokenRef: 'X'.repeat(43),
      };

      const result = await service.createSession(data, 'X'.repeat(43));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // T1 (code review Story 2.1): assertion específica por branch —
        // antes era `instanceof BffSessionError` (genérico) que pasaría
        // aunque la validación se desactive.
        expect(result.error.message).toContain('userId no puede estar vacío');
      }
    });

    it('debe rechazar userId > 256 chars', async () => {
      const data = {
        userId: 'a'.repeat(257),
        companyId: Uuid.random().value,
        roles: ['admin'],
        createdAt: new Date().toISOString(),
        embedTokenRef: 'X'.repeat(43),
      };

      const result = await service.createSession(data, 'X'.repeat(43));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('userId excede el máximo');
      }
    });

    it('debe rechazar companyId vacío', async () => {
      const data = {
        userId: Uuid.random().value,
        companyId: '',
        roles: ['admin'],
        createdAt: new Date().toISOString(),
        embedTokenRef: 'X'.repeat(43),
      };

      const result = await service.createSession(data, 'X'.repeat(43));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'companyId no puede estar vacío',
        );
      }
    });

    it('debe rechazar companyId > 256 chars', async () => {
      const data = {
        userId: Uuid.random().value,
        companyId: 'a'.repeat(257),
        roles: ['admin'],
        createdAt: new Date().toISOString(),
        embedTokenRef: 'X'.repeat(43),
      };

      const result = await service.createSession(data, 'X'.repeat(43));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('companyId excede el máximo');
      }
    });

    it('debe rechazar roles array vacío', async () => {
      const data = {
        userId: Uuid.random().value,
        companyId: Uuid.random().value,
        roles: [],
        createdAt: new Date().toISOString(),
        embedTokenRef: 'X'.repeat(43),
      };

      const result = await service.createSession(data, 'X'.repeat(43));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('roles no puede estar vacío');
      }
    });

    it('debe rechazar roles con > 64 elementos', async () => {
      const data = {
        userId: Uuid.random().value,
        companyId: Uuid.random().value,
        roles: Array.from({ length: 65 }, (_, i) => `role${i}`),
        createdAt: new Date().toISOString(),
        embedTokenRef: 'X'.repeat(43),
      };

      const result = await service.createSession(data, 'X'.repeat(43));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('roles excede el máximo');
      }
    });

    it('debe rechazar un rol string > 256 chars', async () => {
      const data = {
        userId: Uuid.random().value,
        companyId: Uuid.random().value,
        roles: ['a'.repeat(257)],
        createdAt: new Date().toISOString(),
        embedTokenRef: 'X'.repeat(43),
      };

      const result = await service.createSession(data, 'X'.repeat(43));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('rol excede el máximo');
      }
    });

    it('debe rechazar embedTokenRef vacío', async () => {
      const data = {
        userId: Uuid.random().value,
        companyId: Uuid.random().value,
        roles: ['admin'],
        createdAt: new Date().toISOString(),
        embedTokenRef: 'X'.repeat(43),
      };

      const result = await service.createSession(data, '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'embedTokenRef no puede estar vacío',
        );
      }
    });

    it('debe rechazar createdAt faltante', async () => {
      const data = {
        userId: Uuid.random().value,
        companyId: Uuid.random().value,
        roles: ['admin'],
        // createdAt omitido
        embedTokenRef: 'X'.repeat(43),
      } as unknown as Parameters<typeof service.createSession>[0];

      const result = await service.createSession(data, 'X'.repeat(43));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('createdAt');
      }
    });

    it('debe retornar expiresAt como ISO 8601 string válido', async () => {
      const data = {
        userId: Uuid.random().value,
        companyId: Uuid.random().value,
        roles: ['admin'],
        createdAt: new Date().toISOString(),
        embedTokenRef: 'X'.repeat(43),
      };

      const before = Date.now();
      const result = await service.createSession(data, 'X'.repeat(43));
      const after = Date.now();

      expect(result.isOk()).toBe(true);
      const { expiresAt } = result.unwrap();
      const expiresAtMs = new Date(expiresAt).getTime();
      // expiresAt debe estar entre (now + 28800s) y (now + 28800s + 1s tolerancia)
      expect(expiresAtMs).toBeGreaterThanOrEqual(before + 28800 * 1000);
      expect(expiresAtMs).toBeLessThanOrEqual(after + 28800 * 1000 + 1000);
    });

    it('debe retornar Err con BffSessionServiceUnavailableError si Redis tira excepción', async () => {
      // Mock de un cliente que falla en set
      const failingClient = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockRejectedValue(new Error('Connection lost')),
        del: jest.fn().mockResolvedValue(1),
        quit: jest.fn().mockResolvedValue('OK'),
        connect: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };
      const failingService = new RedisBffSessionService(
        failingClient as unknown as ConstructorParameters<
          typeof RedisBffSessionService
        >[0],
      );
      await failingService.onModuleInit();

      const data = {
        userId: Uuid.random().value,
        companyId: Uuid.random().value,
        roles: ['admin'],
        createdAt: new Date().toISOString(),
        embedTokenRef: 'X'.repeat(43),
      };

      const result = await failingService.createSession(data, 'X'.repeat(43));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(BffSessionServiceUnavailableError);
      }
      await failingService.onModuleDestroy();
    });
  });

  describe('getSession', () => {
    it('debe retornar BffSessionData si la key existe y el JSON es válido', async () => {
      const userId = Uuid.random().value;
      const companyId = Uuid.random().value;
      const data = {
        userId,
        companyId,
        roles: ['admin'],
        createdAt: new Date().toISOString(),
        embedTokenRef: 'X'.repeat(43),
      };
      const createResult = await service.createSession(data, 'X'.repeat(43));
      const { sessionId } = createResult.unwrap();

      const getResult = await service.getSession(sessionId);

      expect(getResult.isOk()).toBe(true);
      const session = getResult.unwrap();
      expect(session.userId).toBe(userId);
      expect(session.companyId).toBe(companyId);
      expect(session.roles).toEqual(['admin']);
      expect(session.embedTokenRef).toBe('X'.repeat(43));
    });

    it('debe retornar BffSessionNotFoundError si la key no existe', async () => {
      const nonExistentSessionId = 'A'.repeat(43);

      const result = await service.getSession(nonExistentSessionId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(BffSessionNotFoundError);
      }
    });

    it('debe retornar BffSessionInvalidFormatError si sessionId tiene longitud incorrecta', async () => {
      const result = await service.getSession('short');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(BffSessionInvalidFormatError);
      }
    });

    it('debe retornar BffSessionInvalidFormatError si sessionId excede 43 chars', async () => {
      const result = await service.getSession('a'.repeat(50));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(BffSessionInvalidFormatError);
      }
    });

    it('debe retornar BffSessionInvalidFormatError si sessionId tiene chars no permitidos', async () => {
      const result = await service.getSession('!'.repeat(43));

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(BffSessionInvalidFormatError);
      }
    });

    it('debe retornar BffSessionCorruptedError si el JSON no tiene la shape esperada', async () => {
      const sessionId = 'B'.repeat(43);
      client.store.set(`bff:session:${sessionId}`, '{"notValid":true}');

      const result = await service.getSession(sessionId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(BffSessionCorruptedError);
      }
    });
  });

  describe('revokeSession', () => {
    it('debe eliminar la session y retornar ok', async () => {
      const data = {
        userId: Uuid.random().value,
        companyId: Uuid.random().value,
        roles: ['admin'],
        createdAt: new Date().toISOString(),
        embedTokenRef: 'X'.repeat(43),
      };
      const createResult = await service.createSession(data, 'X'.repeat(43));
      const { sessionId } = createResult.unwrap();

      const revokeResult = await service.revokeSession(sessionId);

      expect(revokeResult.isOk()).toBe(true);
      expect(client.store.has(`bff:session:${sessionId}`)).toBe(false);
    });

    it('debe ser idempotente (key no existe → ok)', async () => {
      const nonExistentSessionId = 'C'.repeat(43);

      const result = await service.revokeSession(nonExistentSessionId);

      expect(result.isOk()).toBe(true);
    });

    it('debe rechazar sessionId con formato inválido', async () => {
      const result = await service.revokeSession('short');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(BffSessionInvalidFormatError);
      }
    });

    // T4 (code review Story 2.1): cubre la rama "Redis down" de
    // revokeSession. Ahora es idempotente (retorna okVoid con log
    // WARN) — este test valida el contrato de Story 2.3 logout flow.
    it('debe ser idempotente y retornar ok si Redis tira excepción (TTL hará efecto)', async () => {
      const sessionId = 'D'.repeat(43);
      const failingClient = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockRejectedValue(new Error('Connection lost')),
        quit: jest.fn().mockResolvedValue('OK'),
        connect: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };
      const failingService = new RedisBffSessionService(
        failingClient as unknown as ConstructorParameters<
          typeof RedisBffSessionService
        >[0],
      );
      await failingService.onModuleInit();

      const result = await failingService.revokeSession(sessionId);

      // Contrato idempotente: Redis down ≠ error de cliente
      expect(result.isOk()).toBe(true);
      await failingService.onModuleDestroy();
    });
  });

  describe('getSession ramas adicionales (T3 + T9)', () => {
    // T3 (code review Story 2.1): cubre la rama "Redis down" de
    // getSession (era el único método público sin test de este branch).
    // Story 2.6 usará getSession desde JwtCookieStrategy.
    it('debe retornar BffSessionServiceUnavailableError si Redis tira excepción en get', async () => {
      const sessionId = 'E'.repeat(43);
      const failingClient = {
        get: jest.fn().mockRejectedValue(new Error('Connection lost')),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        quit: jest.fn().mockResolvedValue('OK'),
        connect: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      };
      const failingService = new RedisBffSessionService(
        failingClient as unknown as ConstructorParameters<
          typeof RedisBffSessionService
        >[0],
      );
      await failingService.onModuleInit();

      const result = await failingService.getSession(sessionId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(BffSessionServiceUnavailableError);
      }
      await failingService.onModuleDestroy();
    });

    // T9 (code review Story 2.1): cubre la rama `JSON.parse throws`
    // (separada de `validateStoredData returns error`).
    it('debe retornar BffSessionCorruptedError si el JSON almacenado es inválido (parse error)', async () => {
      const sessionId = 'F'.repeat(43);
      client.store.set(`bff:session:${sessionId}`, 'not-valid-json{');

      const result = await service.getSession(sessionId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(BffSessionCorruptedError);
      }
    });

    // T2 (code review Story 2.1): cubre los 6 branches de
    // validateStoredData (el test original solo cubría el primero).
    it.each([
      ['null literal', null],
      [
        'missing userId',
        { companyId: 'x', roles: ['a'], createdAt: 't', embedTokenRef: 'z' },
      ],
      [
        'missing companyId',
        { userId: 'x', roles: ['a'], createdAt: 't', embedTokenRef: 'z' },
      ],
      [
        'missing roles',
        { userId: 'x', companyId: 'y', createdAt: 't', embedTokenRef: 'z' },
      ],
      [
        'createdAt not string',
        {
          userId: 'x',
          companyId: 'y',
          roles: ['a'],
          createdAt: 123,
          embedTokenRef: 'z',
        },
      ],
      [
        'missing embedTokenRef',
        { userId: 'x', companyId: 'y', roles: ['a'], createdAt: 't' },
      ],
    ])(
      'debe retornar BffSessionCorruptedError para data corrupta: %s',
      async (_desc, badData) => {
        const sessionId = 'G'.repeat(43);
        client.store.set(`bff:session:${sessionId}`, JSON.stringify(badData));

        const result = await service.getSession(sessionId);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(BffSessionCorruptedError);
        }
      },
    );
  });

  describe('onModuleDestroy', () => {
    it('debe llamar client.quit() sin tirar excepciones', async () => {
      const quitSpy = jest.spyOn(client, 'quit');

      await service.onModuleDestroy();

      expect(quitSpy).toHaveBeenCalled();
    });

    // F3 (code review Story 2.1): verifica que onModuleDestroy
    // resetea `this.client = undefined` para que onModuleInit
    // pueda reconectar en hot reload. Sin este reset, el
    // servicio queda con un client cerrado y todos los métodos
    // retornan 503 hasta reinicio completo.
    it('debe resetear el client para que onModuleInit pueda reconectar (HMR-safe)', async () => {
      await service.onModuleDestroy();

      // Verifica que un nuevo init puede crear un nuevo client
      // (lo cual solo es posible si `this.client` fue reseteado)
      const newClient = new InMemoryRedisClient();
      const newService = new RedisBffSessionService(
        newClient as unknown as ConstructorParameters<
          typeof RedisBffSessionService
        >[0],
      );
      await newService.onModuleInit();
      // El nuevo service funciona → el reset funcionó
      const result = await newService.createSession(
        {
          userId: Uuid.random().value,
          companyId: Uuid.random().value,
          roles: ['admin'],
          createdAt: new Date().toISOString(),
        },
        'X'.repeat(43),
      );
      expect(result.isOk()).toBe(true);
      await newService.onModuleDestroy();
    });
  });
});
