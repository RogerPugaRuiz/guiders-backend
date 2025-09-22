import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ExecutionContext,
  ValidationPipe,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as request from 'supertest';
import { MessageV2Controller } from '../src/context/conversations-v2/infrastructure/controllers/message-v2.controller';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { OptionalAuthGuard } from '../src/context/shared/infrastructure/guards/optional-auth.guard';
import { AuthGuard } from '../src/context/shared/infrastructure/guards/auth.guard';
import { RolesGuard } from '../src/context/shared/infrastructure/guards/role.guard';

// Tipos para evitar problemas de importación
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

// Mock Guards siguiendo el patrón del proyecto
class MockAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MockRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token requerido');
    }

    // Determinar rol basado en el token
    let roles = ['commercial'];
    if (authHeader.includes('visitor-token')) {
      roles = ['visitor'];
    } else if (authHeader.includes('admin-token')) {
      roles = ['admin'];
    } else if (authHeader.includes('supervisor-token')) {
      roles = ['supervisor'];
    }

    request.user = {
      id: 'test-user-id',
      sub: 'test-user-sub',
      roles,
      username: 'test-user',
      email: 'test@example.com',
    };

    return true;
  }
}

class MockRolesGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MockRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Forbidden');
    }

    // Para simplificar, permitimos todos los roles en este mock
    return true;
  }
}

class MockOptionalAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MockRequest>();
    const authHeader = request.headers.authorization;

    // Si no hay auth, asignar usuario por defecto (opcional)
    if (!authHeader) {
      request.user = {
        id: 'test-user-id',
        sub: 'test-user-sub',
        roles: ['commercial'],
        username: 'test-user',
        email: 'test@example.com',
      };
      return true;
    }

    // Si hay auth, validar y asignar usuario
    let roles = ['commercial'];
    if (authHeader.includes('visitor-token')) {
      roles = ['visitor'];
    } else if (authHeader.includes('admin-token')) {
      roles = ['admin'];
    } else if (authHeader.includes('supervisor-token')) {
      roles = ['supervisor'];
    }

    request.user = {
      id: 'test-user-id',
      sub: 'test-user-sub',
      roles,
      username: 'test-user',
      email: 'test@example.com',
    };

    return true;
  }
}

describe('MessageV2Controller (e2e)', () => {
  let app: INestApplication;
  let queryBus: QueryBus;
  let commandBus: CommandBus;

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
      .overrideGuard(OptionalAuthGuard)
      .useClass(MockOptionalAuthGuard)
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    queryBus = moduleFixture.get<QueryBus>(QueryBus);
    commandBus = moduleFixture.get<CommandBus>(CommandBus);

    // Configurar mocks para QueryBus
    (queryBus.execute as jest.Mock).mockImplementation((query) => {
      // Mock para GetChatMessagesQuery
      if (query.constructor.name === 'GetChatMessagesQuery') {
        return Promise.resolve({
          messages: [],
          total: 0,
          hasMore: false,
          nextCursor: undefined,
        });
      }
      // Mock para stats queries
      if (
        query.constructor.name.includes('Stats') ||
        query.constructor.name.includes('Metrics')
      ) {
        return Promise.resolve({
          totalMessages: 0,
          messagesByType: {},
          averageResponseTime: 0,
          unreadCount: 0,
          lastActivity: new Date().toISOString(),
          participantCount: 0,
        });
      }
      // Mock por defecto
      return Promise.resolve({});
    });

    // Configurar mocks para CommandBus
    (commandBus.execute as jest.Mock).mockImplementation((command) => {
      // Mock para SendMessageCommand
      if (command.constructor.name === 'SendMessageCommand') {
        throw new Error('Funcionalidad no implementada');
      }
      // Mock por defecto
      return Promise.resolve({});
    });

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
    it('should return INTERNAL_SERVER_ERROR when sending a valid message (not implemented)', () => {
      return request(app.getHttpServer())
        .post('/v2/messages')
        .send({
          chatId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
          content: 'Test message content',
          type: 'text',
          isInternal: false,
        })
        .expect(500)
        .expect((res) => {
          expect(res.body.message).toBe('Error interno del servidor');
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
        .set('Authorization', 'Bearer commercial-token')
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
        .set('Authorization', 'Bearer commercial-token')
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
        .set('Authorization', 'Bearer commercial-token')
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

  describe('Cursor Pagination with Large Dataset (E2E)', () => {
    const TOTAL_MESSAGES = 100;
    const TEST_CHAT_ID = '550e8400-e29b-41d4-a716-446655440000';

    // Función helper para generar mensajes de prueba
    const generateTestMessages = (startIndex: number, count: number) => {
      return Array.from({ length: count }, (_, i) => {
        const messageIndex = startIndex + i;
        const timestamp = new Date(Date.now() - messageIndex * 60000); // 1 minuto entre mensajes
        return {
          id: `msg-${messageIndex.toString().padStart(3, '0')}`,
          chatId: TEST_CHAT_ID,
          senderId: messageIndex % 2 === 0 ? 'commercial-user' : 'visitor-user',
          content: `Mensaje de prueba número ${messageIndex}`,
          type: 'text',
          isInternal: false,
          isFirstResponse: messageIndex === 0,
          sentAt: timestamp.toISOString(),
          readAt: null,
          createdAt: timestamp.toISOString(),
          updatedAt: timestamp.toISOString(),
        };
      });
    };

    // Función helper para generar cursor base64
    const generateCursor = (offset: number, lastMessageId: string) => {
      const cursorData = {
        offset,
        lastMessageId,
        timestamp: new Date().toISOString(),
      };
      return Buffer.from(JSON.stringify(cursorData)).toString('base64');
    };

    beforeEach(() => {
      // Mock específico para tests de paginación con datos masivos
      (queryBus.execute as jest.Mock).mockImplementation((query) => {
        if (query.constructor.name === 'GetChatMessagesQuery') {
          let { limit = 50 } = query;
          const { cursor } = query;

          // Convertir limit a número si es string
          limit = Number(limit) || 50;

          // Manejar limit 0 (usar default)
          if (limit === 0) {
            limit = 50;
          }

          // Parsear cursor para obtener offset
          let offset = 0;
          if (cursor) {
            try {
              const cursorData = JSON.parse(
                Buffer.from(cursor, 'base64').toString(),
              );
              offset = cursorData.offset || 0;
            } catch {
              offset = 0;
            }
          }

          // Calcular índices para la página actual
          const startIndex = offset;
          const endIndex = Math.min(startIndex + limit, TOTAL_MESSAGES);
          const actualMessagesInThisPage = Math.max(0, endIndex - startIndex);

          let messages: any[] = [];
          if (actualMessagesInThisPage > 0) {
            messages = generateTestMessages(
              startIndex,
              actualMessagesInThisPage,
            );
          }

          // Calcular si hay más mensajes
          const hasMore = endIndex < TOTAL_MESSAGES;

          // Generar cursor para siguiente página
          let nextCursor: string | undefined = undefined;
          if (hasMore && messages.length > 0) {
            const nextOffset = endIndex;
            const lastMessage = messages[messages.length - 1];
            nextCursor = generateCursor(nextOffset, lastMessage.id);
          }

          return Promise.resolve({
            messages,
            total: TOTAL_MESSAGES,
            hasMore,
            nextCursor,
          });
        }

        // Otros mocks permanecen igual
        if (
          query.constructor.name.includes('Stats') ||
          query.constructor.name.includes('Metrics')
        ) {
          return Promise.resolve({
            totalMessages: TOTAL_MESSAGES,
            messagesByType: { text: TOTAL_MESSAGES },
            averageResponseTime: 15.5,
            unreadCount: 25,
            lastActivity: new Date().toISOString(),
            participantCount: 2,
          });
        }

        return Promise.resolve({});
      });
    });

    describe('First Page Load', () => {
      it('should load first page without cursor (default limit 50)', async () => {
        const response = await request(app.getHttpServer())
          .get(`/v2/messages/chat/${TEST_CHAT_ID}`)
          .expect(200);

        expect(response.body).toHaveProperty('messages');
        expect(response.body).toHaveProperty('total', TOTAL_MESSAGES);
        expect(response.body).toHaveProperty('hasMore', true);
        expect(response.body).toHaveProperty('nextCursor');

        // Verificar que retorna exactamente 50 mensajes (límite por defecto)
        expect(response.body.messages).toHaveLength(50);

        // Verificar que los mensajes están en el orden correcto
        const messages = response.body.messages;
        expect(messages[0].id).toBe('msg-000');
        expect(messages[49].id).toBe('msg-049');

        // Verificar que hay cursor para siguiente página
        expect(response.body.nextCursor).toBeDefined();
        expect(typeof response.body.nextCursor).toBe('string');
      });

      it('should load first page with custom limit (20)', async () => {
        const response = await request(app.getHttpServer())
          .get(`/v2/messages/chat/${TEST_CHAT_ID}`)
          .query({ limit: 20 })
          .expect(200);

        expect(response.body.messages).toHaveLength(20);
        expect(response.body.total).toBe(TOTAL_MESSAGES);
        expect(response.body.hasMore).toBe(true);

        // Verificar secuencia de IDs
        const messages = response.body.messages;
        expect(messages[0].id).toBe('msg-000');
        expect(messages[19].id).toBe('msg-019');
      });

      it('should load first page with large limit (100)', async () => {
        const response = await request(app.getHttpServer())
          .get(`/v2/messages/chat/${TEST_CHAT_ID}`)
          .query({ limit: 100 })
          .expect(200);

        expect(response.body.messages).toHaveLength(TOTAL_MESSAGES);
        expect(response.body.total).toBe(TOTAL_MESSAGES);
        expect(response.body.hasMore).toBe(false);
        expect(response.body.nextCursor).toBeUndefined();

        // Verificar que todos los mensajes están presentes
        const messages = response.body.messages;
        expect(messages[0].id).toBe('msg-000');
        expect(messages[TOTAL_MESSAGES - 1].id).toBe('msg-099');
      });
    });

    describe('Cursor-based Pagination Navigation', () => {
      it('should navigate through pages using cursor (limit 20)', async () => {
        const limit = 20;
        let currentCursor: string | undefined = undefined;
        let totalMessagesCollected = 0;
        let pageCount = 0;
        const collectedMessageIds = new Set<string>();

        while (true) {
          pageCount++;
          const query: any = { limit };
          if (currentCursor) {
            query.cursor = currentCursor;
          }

          const response = await request(app.getHttpServer())
            .get(`/v2/messages/chat/${TEST_CHAT_ID}`)
            .query(query)
            .expect(200);

          const { messages, hasMore, nextCursor, total } = response.body;

          // Verificaciones básicas de la página
          expect(Array.isArray(messages)).toBe(true);
          expect(typeof hasMore).toBe('boolean');
          expect(total).toBe(TOTAL_MESSAGES);

          // Verificar que no hay mensajes duplicados
          messages.forEach((msg: any) => {
            expect(collectedMessageIds.has(msg.id)).toBe(false);
            collectedMessageIds.add(msg.id);
          });

          totalMessagesCollected += messages.length;

          if (!hasMore) {
            // Última página
            expect(nextCursor).toBeUndefined();
            break;
          } else {
            // Página intermedia
            expect(messages.length).toBe(limit);
            expect(nextCursor).toBeDefined();
            expect(typeof nextCursor).toBe('string');
            currentCursor = nextCursor;
          }

          // Prevenir bucle infinito
          if (pageCount > 10) {
            throw new Error('Demasiadas páginas, posible bucle infinito');
          }
        }

        // Verificaciones finales
        expect(totalMessagesCollected).toBe(TOTAL_MESSAGES);
        expect(pageCount).toBe(Math.ceil(TOTAL_MESSAGES / limit)); // 5 páginas
        expect(collectedMessageIds.size).toBe(TOTAL_MESSAGES);
      });

      it('should handle middle page navigation correctly', async () => {
        // Simular navegación a página específica (offset 40, limit 20)
        const offset = 40;
        const limit = 20;
        const cursor = generateCursor(offset, 'msg-039');

        const response = await request(app.getHttpServer())
          .get(`/v2/messages/chat/${TEST_CHAT_ID}`)
          .query({ cursor, limit })
          .expect(200);

        expect(response.body.messages).toHaveLength(limit);
        expect(response.body.total).toBe(TOTAL_MESSAGES);
        expect(response.body.hasMore).toBe(true);

        // Verificar que los mensajes corresponden al offset correcto
        const messages = response.body.messages;
        expect(messages[0].id).toBe('msg-040');
        expect(messages[19].id).toBe('msg-059');
      });

      it('should handle last page correctly', async () => {
        // Navegar a la última página (offset 90, limit 20)
        const offset = 90;
        const limit = 20;
        const cursor = generateCursor(offset, 'msg-089');

        const response = await request(app.getHttpServer())
          .get(`/v2/messages/chat/${TEST_CHAT_ID}`)
          .query({ cursor, limit })
          .expect(200);

        // Última página debe tener solo 10 mensajes (90-99)
        expect(response.body.messages).toHaveLength(10);
        expect(response.body.total).toBe(TOTAL_MESSAGES);
        expect(response.body.hasMore).toBe(false);
        expect(response.body.nextCursor).toBeUndefined();

        // Verificar IDs de la última página
        const messages = response.body.messages;
        expect(messages[0].id).toBe('msg-090');
        expect(messages[9].id).toBe('msg-099');
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it('should handle invalid cursor gracefully', async () => {
        const invalidCursor = 'invalid-cursor-string';

        const response = await request(app.getHttpServer())
          .get(`/v2/messages/chat/${TEST_CHAT_ID}`)
          .query({ cursor: invalidCursor, limit: 20 })
          .expect(200);

        // Debe comportarse como primera página cuando el cursor es inválido
        expect(response.body.messages).toHaveLength(20);
        expect(response.body.messages[0].id).toBe('msg-000');
      });

      it('should handle cursor beyond available data', async () => {
        // Cursor que apunta más allá de los datos disponibles
        const beyondCursor = generateCursor(150, 'msg-149');

        const response = await request(app.getHttpServer())
          .get(`/v2/messages/chat/${TEST_CHAT_ID}`)
          .query({ cursor: beyondCursor, limit: 20 })
          .expect(200);

        // Debe retornar lista vacía
        expect(response.body.messages).toHaveLength(0);
        expect(response.body.hasMore).toBe(false);
        expect(response.body.nextCursor).toBeUndefined();
      });

      it('should handle very small limit (1)', async () => {
        const response = await request(app.getHttpServer())
          .get(`/v2/messages/chat/${TEST_CHAT_ID}`)
          .query({ limit: 1 })
          .expect(200);

        expect(response.body.messages).toHaveLength(1);
        expect(response.body.messages[0].id).toBe('msg-000');
        expect(response.body.hasMore).toBe(true);
        expect(response.body.nextCursor).toBeDefined();
      });

      it('should handle zero limit (should use default)', async () => {
        const response = await request(app.getHttpServer())
          .get(`/v2/messages/chat/${TEST_CHAT_ID}`)
          .query({ limit: 0 })
          .expect(200);

        // Con limit 0, debe usar el límite por defecto (50)
        expect(response.body.messages).toHaveLength(50);
        expect(response.body.hasMore).toBe(true);
      });
    });

    describe('Performance and Data Integrity', () => {
      it('should maintain consistent message structure across pages', async () => {
        const response = await request(app.getHttpServer())
          .get(`/v2/messages/chat/${TEST_CHAT_ID}`)
          .query({ limit: 10 })
          .expect(200);

        const messages = response.body.messages;
        expect(messages).toHaveLength(10);

        // Verificar estructura de cada mensaje
        messages.forEach((message: any, index: number) => {
          expect(message).toHaveProperty('id');
          expect(message).toHaveProperty('chatId', TEST_CHAT_ID);
          expect(message).toHaveProperty('senderId');
          expect(message).toHaveProperty('content');
          expect(message).toHaveProperty('type', 'text');
          expect(message).toHaveProperty('isInternal', false);
          expect(message).toHaveProperty('sentAt');
          expect(message).toHaveProperty('createdAt');
          expect(message).toHaveProperty('updatedAt');

          // Verificar formato de fechas
          expect(new Date(message.sentAt).toISOString()).toBe(message.sentAt);
          expect(new Date(message.createdAt).toISOString()).toBe(
            message.createdAt,
          );
          expect(new Date(message.updatedAt).toISOString()).toBe(
            message.updatedAt,
          );

          // Verificar ID secuencial
          expect(message.id).toBe(`msg-${index.toString().padStart(3, '0')}`);
        });
      });

      it('should handle concurrent requests consistently', async () => {
        // Simular múltiples requests simultáneos
        const promises = [
          request(app.getHttpServer())
            .get(`/v2/messages/chat/${TEST_CHAT_ID}`)
            .query({ limit: 25 }),
          request(app.getHttpServer())
            .get(`/v2/messages/chat/${TEST_CHAT_ID}`)
            .query({ limit: 30 }),
          request(app.getHttpServer())
            .get(`/v2/messages/chat/${TEST_CHAT_ID}`)
            .query({ limit: 35 }),
        ];

        const responses = await Promise.all(promises);

        // Todas las respuestas deben ser exitosas
        responses.forEach((response) => {
          expect(response.status).toBe(200);
          expect(response.body.total).toBe(TOTAL_MESSAGES);
        });

        // Verificar que cada respuesta tiene el número correcto de mensajes
        expect(responses[0].body.messages).toHaveLength(25);
        expect(responses[1].body.messages).toHaveLength(30);
        expect(responses[2].body.messages).toHaveLength(35);

        // Todos deben mostrar hasMore = true (ya que ninguno llega a 100)
        responses.forEach((response) => {
          expect(response.body.hasMore).toBe(true);
          expect(response.body.nextCursor).toBeDefined();
        });
      });
    });
  });
});
