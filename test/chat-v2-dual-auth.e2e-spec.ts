import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Injectable } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { CqrsModule, IQueryHandler, QueryHandler } from '@nestjs/cqrs';

// Imports del sistema
import { ChatV2Controller } from '../src/context/conversations-v2/infrastructure/controllers/chat-v2.controller';
import { OptionalAuthGuard } from '../src/context/shared/infrastructure/guards/optional-auth.guard';
import { TokenVerifyService } from '../src/context/shared/infrastructure/token-verify.service';
import { VisitorSessionAuthService } from '../src/context/shared/infrastructure/services/visitor-session-auth.service';
import { GetChatsWithFiltersQuery } from '../src/context/conversations-v2/application/queries/get-chats-with-filters.query';
import { VISITOR_V2_REPOSITORY } from '../src/context/visitors-v2/domain/visitor-v2.repository';

// Tipos para testing
interface ChatListResponse {
  chats: unknown[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

// Mock Query Handler
@Injectable()
@QueryHandler(GetChatsWithFiltersQuery)
class MockGetChatsWithFiltersQueryHandler
  implements IQueryHandler<GetChatsWithFiltersQuery>
{
  execute(query: GetChatsWithFiltersQuery): Promise<ChatListResponse> {
    // Simular respuesta basada en los filtros del query
    const { filters } = query;
    const visitorId = filters?.visitorId;

    return Promise.resolve({
      chats: [
        {
          id: 'chat-1',
          visitorId: visitorId,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      hasMore: false,
      nextCursor: null,
    });
  }
}

// Mock TokenVerifyService
const mockTokenVerifyService = {
  verifyToken: jest.fn(),
};

// Mock VisitorV2Repository
const mockVisitorV2Repository = {
  findBySessionId: jest.fn(),
};

// Mock VisitorSessionAuthService
const mockVisitorSessionAuthService = {
  validateSession: jest.fn(),
};

describe('ChatV2Controller - Dual Authentication E2E', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [ChatV2Controller],
      providers: [
        MockGetChatsWithFiltersQueryHandler,
        OptionalAuthGuard,
        {
          provide: TokenVerifyService,
          useValue: mockTokenVerifyService,
        },
        {
          provide: VisitorSessionAuthService,
          useValue: mockVisitorSessionAuthService,
        },
        {
          provide: VISITOR_V2_REPOSITORY,
          useValue: mockVisitorV2Repository,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    await app.init();

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /v2/chats/visitor/:visitorId - JWT Authentication', () => {
    it('debe permitir acceso con JWT de comercial', async () => {
      const visitorId = 'visitor-123';
      const mockToken = 'valid-commercial-token';

      // Configurar mock para JWT válido
      mockTokenVerifyService.verifyToken.mockResolvedValue({
        sub: 'commercial-456',
        typ: 'access',
        role: ['commercial'],
        username: 'Commercial User',
        email: 'commercial@example.com',
        companyId: 'company-789',
      });

      const response = await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('chats');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('hasMore');
      expect(response.body).toHaveProperty('nextCursor');
      expect(mockTokenVerifyService.verifyToken).toHaveBeenCalledWith(
        mockToken,
      );
    });

    it('debe permitir acceso con JWT de administrador', async () => {
      const visitorId = 'visitor-123';
      const mockToken = 'valid-admin-token';

      // Configurar mock para JWT de admin válido
      mockTokenVerifyService.verifyToken.mockResolvedValue({
        sub: 'admin-456',
        typ: 'access',
        role: ['admin'],
        username: 'Admin User',
        email: 'admin@example.com',
        companyId: 'company-789',
      });

      await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(mockTokenVerifyService.verifyToken).toHaveBeenCalledWith(
        mockToken,
      );
    });

    it('debe denegar acceso con JWT de rol inválido', async () => {
      const visitorId = 'visitor-123';
      const mockToken = 'valid-but-wrong-role-token';

      // Configurar mock para JWT con rol no autorizado
      mockTokenVerifyService.verifyToken.mockResolvedValue({
        sub: 'user-456',
        typ: 'access',
        role: ['guest'], // Rol no autorizado
        username: 'Guest User',
        email: 'guest@example.com',
        companyId: 'company-789',
      });

      await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403);

      expect(mockTokenVerifyService.verifyToken).toHaveBeenCalledWith(
        mockToken,
      );
    });
  });

  describe('GET /v2/chats/visitor/:visitorId - Visitor Session Authentication', () => {
    it('debe permitir acceso con cookie de sesión válida del mismo visitante', async () => {
      const visitorId = 'visitor-123';
      const sessionId = 'session-456';

      // Configurar mock para sesión válida
      mockVisitorSessionAuthService.validateSession.mockResolvedValue({
        visitorId: visitorId, // Mismo visitante que en la URL
        tenantId: 'tenant-789',
        siteId: 'site-012',
        sessionId: sessionId,
        username: 'Visitante',
        email: undefined,
      });

      const response = await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .set('Cookie', [`sid=${sessionId}`])
        .expect(200);

      expect(response.body).toHaveProperty('chats');
      expect(
        mockVisitorSessionAuthService.validateSession,
      ).toHaveBeenCalledWith(sessionId);
    });

    it('debe denegar acceso con cookie de sesión de visitante diferente', async () => {
      const visitorId = 'visitor-123';
      const sessionId = 'session-456';

      // Configurar mock para sesión de visitante diferente
      mockVisitorSessionAuthService.validateSession.mockResolvedValue({
        visitorId: 'visitor-999', // Visitante diferente al de la URL
        tenantId: 'tenant-789',
        siteId: 'site-012',
        sessionId: sessionId,
        username: 'Otro Visitante',
        email: undefined,
      });

      await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .set('Cookie', [`sid=${sessionId}`])
        .expect(403);

      expect(
        mockVisitorSessionAuthService.validateSession,
      ).toHaveBeenCalledWith(sessionId);
    });

    it('debe denegar acceso con cookie de sesión inválida', async () => {
      const visitorId = 'visitor-123';
      const sessionId = 'invalid-session';

      // Configurar mock para sesión inválida
      mockVisitorSessionAuthService.validateSession.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .set('Cookie', [`sid=${sessionId}`])
        .expect(401);

      expect(
        mockVisitorSessionAuthService.validateSession,
      ).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('GET /v2/chats/visitor/:visitorId - Sin autenticación', () => {
    it('debe denegar acceso sin ninguna forma de autenticación', async () => {
      const visitorId = 'visitor-123';

      await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .expect(401);

      // Verificar que no se llamaron los servicios de autenticación
      expect(mockTokenVerifyService.verifyToken).not.toHaveBeenCalled();
      expect(
        mockVisitorSessionAuthService.validateSession,
      ).not.toHaveBeenCalled();
    });

    it('debe denegar acceso con JWT inválido', async () => {
      const visitorId = 'visitor-123';
      const mockToken = 'invalid-token';

      // Configurar mock para JWT inválido
      mockTokenVerifyService.verifyToken.mockRejectedValue(
        new Error('Invalid token'),
      );

      await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(401);

      expect(mockTokenVerifyService.verifyToken).toHaveBeenCalledWith(
        mockToken,
      );
    });
  });

  describe('GET /v2/chats/visitor/:visitorId - Casos edge', () => {
    it('debe manejar JWT con visitante que accede a sus propios chats', async () => {
      const visitorId = 'visitor-123';
      const mockToken = 'valid-visitor-token';

      // Configurar mock para JWT de visitante
      mockTokenVerifyService.verifyToken.mockResolvedValue({
        sub: visitorId, // Mismo ID del visitante
        typ: 'access',
        role: ['visitor'],
        username: 'Visitante JWT',
        email: 'visitor@example.com',
      });

      await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(mockTokenVerifyService.verifyToken).toHaveBeenCalledWith(
        mockToken,
      );
    });

    it('debe denegar acceso a visitante JWT que intenta ver chats de otro visitante', async () => {
      const visitorId = 'visitor-123';
      const mockToken = 'valid-visitor-token';

      // Configurar mock para JWT de visitante diferente
      mockTokenVerifyService.verifyToken.mockResolvedValue({
        sub: 'visitor-999', // ID diferente al visitante de la URL
        typ: 'access',
        role: ['visitor'],
        username: 'Otro Visitante JWT',
        email: 'other-visitor@example.com',
      });

      await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403);

      expect(mockTokenVerifyService.verifyToken).toHaveBeenCalledWith(
        mockToken,
      );
    });

    it('debe preferir JWT sobre cookie cuando ambos están presentes', async () => {
      const visitorId = 'visitor-123';
      const mockToken = 'valid-commercial-token';
      const sessionId = 'session-456';

      // Configurar mocks
      mockTokenVerifyService.verifyToken.mockResolvedValue({
        sub: 'commercial-456',
        typ: 'access',
        role: ['commercial'],
        username: 'Commercial User',
        email: 'commercial@example.com',
        companyId: 'company-789',
      });

      mockVisitorSessionAuthService.validateSession.mockResolvedValue({
        visitorId: visitorId,
        tenantId: 'tenant-789',
        siteId: 'site-012',
        sessionId: sessionId,
        username: 'Visitante',
        email: undefined,
      });

      await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .set('Authorization', `Bearer ${mockToken}`)
        .set('Cookie', [`sid=${sessionId}`])
        .expect(200);

      // Debe usar JWT, no la cookie
      expect(mockTokenVerifyService.verifyToken).toHaveBeenCalledWith(
        mockToken,
      );
      expect(
        mockVisitorSessionAuthService.validateSession,
      ).not.toHaveBeenCalled();
    });
  });
});
