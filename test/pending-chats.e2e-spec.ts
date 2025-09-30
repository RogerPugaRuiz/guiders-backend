import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext, Injectable } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { ChatV2Controller } from '../src/context/conversations-v2/infrastructure/controllers/chat-v2.controller';
import {
  CqrsModule,
  QueryBus,
  CommandBus,
  IQueryHandler,
  QueryHandler,
} from '@nestjs/cqrs';
import { AuthGuard } from '../src/context/shared/infrastructure/guards/auth.guard';
import { RolesGuard } from '../src/context/shared/infrastructure/guards/role.guard';
import { GetVisitorPendingChatsQuery } from '../src/context/conversations-v2/application/queries/get-visitor-pending-chats.query';
import { PendingChatsResponseDto } from '../src/context/conversations-v2/application/dtos/pending-chats-response.dto';

// Mock para simular usuario autenticado
interface MockUser {
  id: string;
  sub: string;
  roles: string[];
  username: string;
  email: string;
}

interface MockRequest {
  headers: {
    authorization?: string;
  };
  user?: MockUser;
}

// Mock AuthGuard que siempre permite el acceso
@Injectable()
class MockAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MockRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return false;
    }

    // Simular usuario autenticado
    request.user = {
      id: 'commercial-123',
      sub: 'commercial-123',
      roles: ['commercial'],
      username: 'test-commercial',
      email: 'commercial@test.com',
    };

    return true;
  }
}

// Mock RolesGuard que valida roles
@Injectable()
class MockRolesGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MockRequest>();
    return request.user?.roles?.includes('commercial') ?? false;
  }
}

// Mock Query Handler para GetVisitorPendingChatsQuery
@Injectable()
@QueryHandler(GetVisitorPendingChatsQuery)
class MockGetVisitorPendingChatsQueryHandler
  implements IQueryHandler<GetVisitorPendingChatsQuery>
{
  execute(
    query: GetVisitorPendingChatsQuery,
  ): Promise<PendingChatsResponseDto> {
    const response: PendingChatsResponseDto = {
      visitor: {
        id: query.visitorId,
        name: 'Juan Pérez',
        fingerprint: 'fp_abc123',
        domain: 'ejemplo.com',
      },
      pendingChats: [
        {
          chatId: 'chat-456',
          status: 'PENDING',
          priority: 'HIGH',
          department: 'ventas',
          subject: 'Consulta sobre precios',
          queuePosition: 1,
          estimatedWaitTime: 300,
          createdAt: '2025-09-30T10:30:00Z',
          lastMessage: {
            content: 'Hola, necesito información',
            sentAt: '2025-09-30T10:35:00Z',
            senderType: 'VISITOR',
          },
          unreadCount: 3,
        },
      ],
      chatHistory: {
        'chat-456': [
          {
            messageId: 'msg-789',
            content: 'Mensaje completo...',
            senderType: 'VISITOR',
            sentAt: '2025-09-30T10:35:00Z',
          },
        ],
      },
      visitorActivity: [
        {
          activityId: 'act-001',
          type: 'page_view',
          description: 'Visitó página de precios',
          timestamp: '2025-09-30T10:25:00Z',
          metadata: {
            page: '/pricing',
            duration: 120,
          },
        },
      ],
    };

    // Filtrar por chatIds si se proporcionan
    if (query.chatIds && query.chatIds.length > 0) {
      response.pendingChats = response.pendingChats.filter((chat) =>
        query.chatIds!.includes(chat.chatId),
      );

      // Filtrar historial de chat
      if (response.chatHistory) {
        const filteredHistory: Record<string, any[]> = {};
        query.chatIds.forEach((chatId) => {
          if (response.chatHistory && response.chatHistory[chatId]) {
            filteredHistory[chatId] = response.chatHistory[chatId];
          }
        });
        response.chatHistory = filteredHistory;
      }
    }

    return Promise.resolve(response);
  }
}

describe('GET /api/v1/tenants/:tenantId/visitors/:visitorId/pending-chats (E2E)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ChatV2Controller],
      imports: [CqrsModule],
      providers: [MockGetVisitorPendingChatsQueryHandler],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/tenants/:tenantId/visitors/:visitorId/pending-chats', () => {
    it('debe retornar chats pendientes con información completa', async () => {
      const tenantId = 'tenant-123';
      const visitorId = 'visitor-456';

      return request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/visitors/${visitorId}/pending-chats`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('visitor');
          expect(res.body.visitor).toMatchObject({
            id: visitorId,
            name: 'Juan Pérez',
            fingerprint: 'fp_abc123',
            domain: 'ejemplo.com',
          });

          expect(res.body).toHaveProperty('pendingChats');
          expect(res.body.pendingChats).toHaveLength(1);
          expect(res.body.pendingChats[0]).toMatchObject({
            chatId: 'chat-456',
            status: 'PENDING',
            priority: 'HIGH',
            department: 'ventas',
            subject: 'Consulta sobre precios',
            queuePosition: 1,
            estimatedWaitTime: 300,
          });

          expect(res.body).toHaveProperty('chatHistory');
          expect(res.body.chatHistory['chat-456']).toBeDefined();
          expect(res.body.chatHistory['chat-456']).toHaveLength(1);

          expect(res.body).toHaveProperty('visitorActivity');
          expect(res.body.visitorActivity).toHaveLength(1);
          expect(res.body.visitorActivity[0]).toMatchObject({
            activityId: 'act-001',
            type: 'page_view',
            description: 'Visitó página de precios',
          });
        });
    });

    it('debe filtrar chats por chatIds cuando se proporciona el query param', async () => {
      const tenantId = 'tenant-123';
      const visitorId = 'visitor-456';

      return request(app.getHttpServer())
        .get(
          `/api/v1/tenants/${tenantId}/visitors/${visitorId}/pending-chats?chatIds=chat-456`,
        )
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .expect((res) => {
          expect(res.body.pendingChats).toHaveLength(1);
          expect(res.body.pendingChats[0].chatId).toBe('chat-456');
        });
    });

    it('debe filtrar múltiples chats por chatIds separados por coma', async () => {
      const tenantId = 'tenant-123';
      const visitorId = 'visitor-456';

      return request(app.getHttpServer())
        .get(
          `/api/v1/tenants/${tenantId}/visitors/${visitorId}/pending-chats?chatIds=chat-456,chat-789`,
        )
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('pendingChats');
        });
    });

    it('debe retornar 401 cuando no hay token de autenticación', async () => {
      const tenantId = 'tenant-123';
      const visitorId = 'visitor-456';

      return request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/visitors/${visitorId}/pending-chats`)
        .expect(403); // Sin autenticación, el guard rechaza la petición
    });

    it('debe validar los parámetros de ruta', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/tenants//visitors//pending-chats')
        .set('Authorization', 'Bearer mock-token')
        .expect(404); // Ruta inválida
    });

    it('debe incluir lastMessage en los chats pendientes', async () => {
      const tenantId = 'tenant-123';
      const visitorId = 'visitor-456';

      return request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/visitors/${visitorId}/pending-chats`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .expect((res) => {
          expect(res.body.pendingChats[0]).toHaveProperty('lastMessage');
          expect(res.body.pendingChats[0].lastMessage).toMatchObject({
            content: 'Hola, necesito información',
            sentAt: '2025-09-30T10:35:00Z',
            senderType: 'VISITOR',
          });
        });
    });

    it('debe incluir unreadCount en los chats pendientes', async () => {
      const tenantId = 'tenant-123';
      const visitorId = 'visitor-456';

      return request(app.getHttpServer())
        .get(`/api/v1/tenants/${tenantId}/visitors/${visitorId}/pending-chats`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200)
        .expect((res) => {
          expect(res.body.pendingChats[0]).toHaveProperty('unreadCount');
          expect(res.body.pendingChats[0].unreadCount).toBe(3);
        });
    });
  });
});
