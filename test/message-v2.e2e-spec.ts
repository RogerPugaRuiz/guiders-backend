import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  Injectable,
  CanActivate,
  ExecutionContext,
  ValidationPipe,
} from '@nestjs/common';
import * as request from 'supertest';
import { MessageV2Controller } from '../src/context/conversations-v2/infrastructure/controllers/message-v2.controller';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { AuthGuard } from '../src/context/shared/infrastructure/guards/auth.guard';
import { RolesGuard } from '../src/context/shared/infrastructure/guards/role.guard';

// Mock guards para simplificar el test
@Injectable()
class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Simular usuario autenticado
    request.user = {
      id: 'user-123',
      roles: ['commercial'],
      sub: 'user-123',
    };
    return true;
  }
}

@Injectable()
class MockRolesGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

describe('MessageV2Controller (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MessageV2Controller],
      providers: [
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();

    // Habilitar validación de datos
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Basic Controller Tests', () => {
    it('should be defined', () => {
      expect(app).toBeDefined();
    });

    it('should have the controller registered', () => {
      const controller = app.get(MessageV2Controller);
      expect(controller).toBeDefined();
    });
  });

  describe('/v2/messages (POST)', () => {
    it('should return NOT_IMPLEMENTED when sending a valid message', () => {
      return request(app.getHttpServer())
        .post('/v2/messages')
        .send({
          chatId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
          content: 'Test message content',
          type: 'text',
          isInternal: false,
        })
        .expect(501)
        .expect((res) => {
          expect(res.body.message).toBe('Funcionalidad no implementada');
        });
    });
  });

  describe('/v2/messages/chat/:chatId (GET)', () => {
    it('should return empty message list for valid chat', () => {
      return request(app.getHttpServer())
        .get('/v2/messages/chat/550e8400-e29b-41d4-a716-446655440000')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            messages: [],
            total: 0,
            hasMore: false,
            nextCursor: undefined,
          });
        });
    });

    it('should accept pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/v2/messages/chat/550e8400-e29b-41d4-a716-446655440000')
        .query({
          limit: 20,
          cursor: 'sample-cursor',
        })
        .expect(200);
    });
  });

  describe('/v2/messages/:messageId (GET)', () => {
    it('should return NOT_FOUND for any message ID', () => {
      return request(app.getHttpServer())
        .get('/v2/messages/550e8400-e29b-41d4-a716-446655440001')
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe('Mensaje no encontrado');
        });
    });
  });

  describe('/v2/messages/mark-as-read (PUT)', () => {
    it('should mark messages as read successfully', () => {
      return request(app.getHttpServer())
        .put('/v2/messages/mark-as-read')
        .send({
          messageIds: [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            success: true,
            markedCount: 2,
          });
        });
    });
  });

  describe('/v2/messages/chat/:chatId/unread (GET)', () => {
    it('should return empty array for unread messages', () => {
      return request(app.getHttpServer())
        .get('/v2/messages/chat/550e8400-e29b-41d4-a716-446655440000/unread')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual([]);
        });
    });
  });

  describe('/v2/messages/chat/:chatId/stats (GET)', () => {
    it('should return conversation stats', () => {
      return request(app.getHttpServer())
        .get('/v2/messages/chat/550e8400-e29b-41d4-a716-446655440000/stats')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            totalMessages: 0,
            messagesByType: {},
            averageResponseTime: 0,
            unreadCount: 0,
            lastActivity: expect.any(String),
            participantCount: 0,
          });
        });
    });

    it('should accept date range parameters', () => {
      return request(app.getHttpServer())
        .get('/v2/messages/chat/550e8400-e29b-41d4-a716-446655440000/stats')
        .query({
          dateFrom: '2025-07-01T00:00:00Z',
          dateTo: '2025-07-31T23:59:59Z',
        })
        .expect(200);
    });
  });

  describe('Response Format Validation', () => {
    it('should return properly formatted message list response', () => {
      return request(app.getHttpServer())
        .get('/v2/messages/chat/550e8400-e29b-41d4-a716-446655440000')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('messages');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('hasMore');
          expect(Array.isArray(res.body.messages)).toBe(true);
          expect(typeof res.body.total).toBe('number');
          expect(typeof res.body.hasMore).toBe('boolean');
        });
    });

    it('should return properly formatted conversation stats', () => {
      return request(app.getHttpServer())
        .get('/v2/messages/chat/550e8400-e29b-41d4-a716-446655440000/stats')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalMessages');
          expect(res.body).toHaveProperty('messagesByType');
          expect(res.body).toHaveProperty('averageResponseTime');
          expect(res.body).toHaveProperty('unreadCount');
          expect(res.body).toHaveProperty('lastActivity');
          expect(res.body).toHaveProperty('participantCount');
          expect(typeof res.body.totalMessages).toBe('number');
          expect(typeof res.body.messagesByType).toBe('object');
          expect(typeof res.body.averageResponseTime).toBe('number');
          expect(typeof res.body.unreadCount).toBe('number');
          expect(typeof res.body.lastActivity).toBe('string');
          expect(typeof res.body.participantCount).toBe('number');
        });
    });
  });

  describe('Error Handling', () => {
    it('should handle not found message requests correctly', () => {
      return request(app.getHttpServer())
        .get('/v2/messages/non-existent-message')
        .expect(404);
    });

    it('should handle invalid POST requests with validation errors', () => {
      return request(app.getHttpServer())
        .post('/v2/messages')
        .send({
          // Missing required chatId
          content: 'Valid message content',
          type: 'text',
        })
        .expect(400);
    });
  });
});
