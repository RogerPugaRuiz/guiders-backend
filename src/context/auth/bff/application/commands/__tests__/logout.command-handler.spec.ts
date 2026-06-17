import { Test } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { ok, err, okVoid } from 'src/context/shared/domain/result';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

import {
  EMBED_TOKEN_SERVICE,
  IEmbedTokenService,
} from 'src/context/auth/integration-api-key/domain/services/embed-token.service';
import {
  BFF_SESSION_SERVICE,
  IBffSessionService,
} from '../../../domain/services/bff-session.service';
import { BffSessionData } from '../../../domain/value-objects/bff-session-data';
import {
  BffSessionNotFoundError,
  BffSessionServiceUnavailableError,
} from '../../../domain/errors/bff-session.errors';
import { EmbedTokenNotFoundError } from 'src/context/auth/integration-api-key/domain/errors/embed-token.errors';

import { LogoutCommand } from '../logout.command';
import { LogoutCommandHandler } from '../logout.command-handler';

describe('LogoutCommandHandler (unit) - Story 2.3', () => {
  let handler: LogoutCommandHandler;
  const mockBffSessions: jest.Mocked<IBffSessionService> = {
    createSession: jest.fn(),
    getSession: jest.fn(),
    revokeSession: jest.fn(),
  } as unknown as jest.Mocked<IBffSessionService>;

  const mockEmbedTokens: jest.Mocked<IEmbedTokenService> = {
    createToken: jest.fn(),
    validateToken: jest.fn(),
    refreshToken: jest.fn(),
    revokeToken: jest.fn(),
  } as unknown as jest.Mocked<IEmbedTokenService>;

  const mockEventBus: jest.Mocked<EventBus> = {
    publish: jest.fn(),
  } as unknown as jest.Mocked<EventBus>;

  const sessionId = Uuid.random().value;
  const embedTokenRef = Uuid.random().value.replace(/-/g, '_').slice(0, 43);
  const userId = Uuid.random().value;
  const companyId = Uuid.random().value;

  const makeSession = (
    overrides: Partial<BffSessionData> = {},
  ): BffSessionData => ({
    userId,
    companyId,
    roles: ['admin'],
    createdAt: new Date().toISOString(),
    embedTokenRef,
    ...overrides,
  });

  const makeCommand = (overrides: Partial<LogoutCommand> = {}): LogoutCommand =>
    new LogoutCommand(
      overrides.sessionId ?? sessionId,
      overrides.ipAddress ?? '127.0.0.1',
      overrides.userAgent ?? 'jest-test/1.0',
      overrides.origin ?? 'https://app.leadcars.com',
    );

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        LogoutCommandHandler,
        { provide: BFF_SESSION_SERVICE, useValue: mockBffSessions },
        { provide: EMBED_TOKEN_SERVICE, useValue: mockEmbedTokens },
        { provide: EventBus, useValue: mockEventBus },
      ],
    }).compile();

    handler = moduleRef.get(LogoutCommandHandler);
    jest.clearAllMocks();
  });

  describe('happy path — both DELs succeed', () => {
    it('debe retornar ok con cascadingResult=SUCCESS cuando ambos Redis DELs retornan 1', async () => {
      // Arrange
      mockBffSessions.getSession.mockResolvedValue(ok(makeSession()));
      mockBffSessions.revokeSession.mockResolvedValue(okVoid());
      mockEmbedTokens.revokeToken.mockResolvedValue(okVoid());

      // Act
      const result = await handler.execute(makeCommand());

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.cascadingResult.toJSON()).toBe('success');
        expect(result.value.sessionId).toBe(sessionId);
        expect(result.value.embedTokenRevoked).toBe(true);
      }
    });

    it('debe emitir EmbedTokenAuthenticatedEvent con logoutTimestamp y cascadingResult', async () => {
      // Arrange
      mockBffSessions.getSession.mockResolvedValue(ok(makeSession()));
      mockBffSessions.revokeSession.mockResolvedValue(okVoid());
      mockEmbedTokens.revokeToken.mockResolvedValue(okVoid());

      // Act
      await handler.execute(makeCommand());

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as any;
      expect(publishedEvent).toBeDefined();
      expect(publishedEvent.attributes).toBeDefined();
      expect(publishedEvent.attributes.logoutTimestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
      expect(publishedEvent.attributes.cascadingResult).toBe('success');
      expect(publishedEvent.attributes.embedTokenRevoked).toBe(true);
    });
  });

  describe('partial path — embed token already revoked (race condition)', () => {
    it('debe retornar ok con cascadingResult=PARTIAL cuando token revoke retorna NotFound', async () => {
      // Arrange
      mockBffSessions.getSession.mockResolvedValue(ok(makeSession()));
      mockBffSessions.revokeSession.mockResolvedValue(okVoid());
      mockEmbedTokens.revokeToken.mockResolvedValue(
        err(new EmbedTokenNotFoundError('embed-tok')),
      );

      // Act
      const result = await handler.execute(makeCommand());

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.cascadingResult.toJSON()).toBe('partial');
        expect(result.value.embedTokenRevoked).toBe(false);
      }
    });

    it('debe emitir EmbedTokenAuthenticatedEvent con cascadingResult=partial y detail="token already revoked"', async () => {
      // Arrange
      mockBffSessions.getSession.mockResolvedValue(ok(makeSession()));
      mockBffSessions.revokeSession.mockResolvedValue(okVoid());
      mockEmbedTokens.revokeToken.mockResolvedValue(
        err(new EmbedTokenNotFoundError('embed-tok')),
      );

      // Act
      await handler.execute(makeCommand());

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as any;
      expect(publishedEvent.attributes.cascadingResult).toBe('partial');
      expect(publishedEvent.attributes.failureDetail).toContain(
        'token already revoked',
      );
    });
  });

  describe('session not found — 401 EMBED_SESSION_NOT_FOUND', () => {
    it('debe retornar err con BffSessionNotFoundError cuando getSession retorna NotFound', async () => {
      // Arrange
      mockBffSessions.getSession.mockResolvedValue(
        err(new BffSessionNotFoundError(sessionId.slice(0, 8))),
      );

      // Act
      const result = await handler.execute(makeCommand());

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(BffSessionNotFoundError);
      }
    });

    it('debe emitir EmbedTokenAuthenticationFailedEvent con reason=EMBED_SESSION_NOT_FOUND', async () => {
      // Arrange
      mockBffSessions.getSession.mockResolvedValue(
        err(new BffSessionNotFoundError()),
      );

      // Act
      await handler.execute(makeCommand());

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as any;
      expect(publishedEvent.attributes.failureReason).toBe(
        'EMBED_SESSION_NOT_FOUND',
      );
    });

    it('NO debe llamar a revokeToken ni revokeSession cuando la session no existe', async () => {
      // Arrange
      mockBffSessions.getSession.mockResolvedValue(
        err(new BffSessionNotFoundError()),
      );

      // Act
      await handler.execute(makeCommand());

      // Assert
      expect(mockBffSessions.revokeSession).not.toHaveBeenCalled();
      expect(mockEmbedTokens.revokeToken).not.toHaveBeenCalled();
    });
  });

  describe('Redis down — 503 EMBED_SERVICE_UNAVAILABLE', () => {
    it('debe retornar err con BffSessionServiceUnavailableError cuando Redis falla', async () => {
      // Arrange
      mockBffSessions.getSession.mockResolvedValue(
        err(
          new BffSessionServiceUnavailableError(
            'Connection refused at 10.0.0.5:6379',
          ),
        ),
      );

      // Act
      const result = await handler.execute(makeCommand());

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(BffSessionServiceUnavailableError);
      }
    });

    it('debe emitir failureDetail con mensaje específico de Redis (AI-3: NO instanceof BaseError)', async () => {
      // Arrange
      mockBffSessions.getSession.mockResolvedValue(
        err(new BffSessionServiceUnavailableError('Connection refused')),
      );

      // Act
      await handler.execute(makeCommand());

      // Assert
      const publishedEvent = mockEventBus.publish.mock.calls[0][0] as any;
      expect(publishedEvent.attributes.failureReason).toBe(
        'EMBED_SERVICE_UNAVAILABLE',
      );
      expect(publishedEvent.attributes.failureDetail).toContain(
        'Connection refused',
      );
    });
  });

  describe('tryPublish wrapper — failure in eventBus.publish does NOT break handler', () => {
    it('debe retornar ok incluso si eventBus.publish throws', async () => {
      // Arrange
      mockBffSessions.getSession.mockResolvedValue(ok(makeSession()));
      mockBffSessions.revokeSession.mockResolvedValue(okVoid());
      mockEmbedTokens.revokeToken.mockResolvedValue(okVoid());
      mockEventBus.publish.mockImplementation(() => {
        throw new Error('EventBus down');
      });

      // Act
      const result = await handler.execute(makeCommand());

      // Assert: tryPublish should swallow the error
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.cascadingResult.toJSON()).toBe('success');
      }
    });
  });

  describe('idempotency', () => {
    it('debe ser idempotente — 2 calls con misma sessionId ambos retornan ok (SESSION_NOT_FOUND en el 2do)', async () => {
      // First call: success
      mockBffSessions.getSession.mockResolvedValueOnce(ok(makeSession()));
      mockBffSessions.revokeSession.mockResolvedValueOnce(okVoid());
      mockEmbedTokens.revokeToken.mockResolvedValueOnce(okVoid());

      // Act 1
      const result1 = await handler.execute(makeCommand());
      expect(result1.isOk()).toBe(true);

      // Second call: session was deleted by the first call
      mockBffSessions.getSession.mockResolvedValueOnce(
        err(new BffSessionNotFoundError()),
      );

      // Act 2
      const result2 = await handler.execute(makeCommand());

      // Assert: 2nd call returns err (NOT_FOUND) but does NOT throw
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error).toBeInstanceOf(BffSessionNotFoundError);
      }
    });
  });
});
