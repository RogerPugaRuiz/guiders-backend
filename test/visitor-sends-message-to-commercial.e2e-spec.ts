/**
 * E2E Test: Flujo completo visitante → comercial
 *
 * Simula el flujo real de la API:
 * 1. El visitante crea un chat con su primer mensaje
 * 2. El comercial obtiene la lista de chats pendientes y ve el chat nuevo
 * 3. El comercial asigna el chat a sí mismo
 * 4. El visitante envía un segundo mensaje
 * 5. El comercial lee los mensajes no leídos (badge activo)
 * 6. El comercial responde con un mensaje
 * 7. El comercial resetea el contador de no leídos
 * 8. Se verifica el estado final del chat
 *
 * Patrón: guards mockeados + CommandBus/QueryBus mockeados
 * No requiere BD real ni Redis.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { CqrsModule, CommandBus, QueryBus } from '@nestjs/cqrs';
import { ok, err } from '../src/context/shared/domain/result';
import { DomainError } from '../src/context/shared/domain/domain.error';

// Controladores bajo test
import { ChatV2Controller } from '../src/context/conversations-v2/infrastructure/controllers/chat-v2.controller';
import { MessageV2Controller } from '../src/context/conversations-v2/infrastructure/controllers/message-v2.controller';

// Guards
import { AuthGuard } from '../src/context/shared/infrastructure/guards/auth.guard';
import { DualAuthGuard } from '../src/context/shared/infrastructure/guards/dual-auth.guard';
import { OptionalAuthGuard } from '../src/context/shared/infrastructure/guards/optional-auth.guard';
import { RolesGuard } from '../src/context/shared/infrastructure/guards/role.guard';

// Servicios requeridos por los guards
import { TokenVerifyService } from '../src/context/shared/infrastructure/token-verify.service';
import { VisitorSessionAuthService } from '../src/context/shared/infrastructure/services/visitor-session-auth.service';
import { BffSessionAuthService } from '../src/context/shared/infrastructure/services/bff-session-auth.service';

// ----------------------------------------------------------------
// UUIDs fijos para el escenario
// ----------------------------------------------------------------
const VISITOR_ID = '10000000-0000-4000-a000-000000000001';
const COMMERCIAL_ID = '20000000-0000-4000-a000-000000000002';
const COMPANY_ID = '30000000-0000-4000-a000-000000000003';
const CHAT_ID = '40000000-0000-4000-a000-000000000004';
const MESSAGE_ID_1 = '50000000-0000-4000-a000-000000000005';
const MESSAGE_ID_2 = '50000000-0000-4000-a000-000000000006';
const MESSAGE_ID_3 = '50000000-0000-4000-a000-000000000007';

// ----------------------------------------------------------------
// Tipos de usuario para los mock guards
// ----------------------------------------------------------------
type UserRole = 'visitor' | 'commercial' | 'admin' | 'supervisor';

interface MockUser {
  id: string;
  sub: string;
  roles: UserRole[];
  email: string;
  companyId: string;
}

interface MockRequest {
  headers: Record<string, string | undefined>;
  cookies?: Record<string, string>;
  user?: MockUser;
}

// ----------------------------------------------------------------
// Token helpers (simulan los valores que usa el frontend)
// ----------------------------------------------------------------
const VISITOR_BEARER = `Bearer visitor-token-${VISITOR_ID}`;
const COMMERCIAL_BEARER = `Bearer commercial-token-${COMMERCIAL_ID}`;

function resolveUser(authHeader: string | undefined): MockUser {
  if (!authHeader) {
    throw new UnauthorizedException('Token de autorización requerido');
  }
  if (authHeader.includes('visitor-token')) {
    return {
      id: VISITOR_ID,
      sub: VISITOR_ID,
      roles: ['visitor'],
      email: 'visitante@ejemplo.com',
      companyId: COMPANY_ID,
    };
  }
  if (authHeader.includes('commercial-token')) {
    return {
      id: COMMERCIAL_ID,
      sub: COMMERCIAL_ID,
      roles: ['commercial'],
      email: 'comercial@empresa.com',
      companyId: COMPANY_ID,
    };
  }
  throw new UnauthorizedException('Token inválido');
}

// ----------------------------------------------------------------
// Mock Guards
// ----------------------------------------------------------------
@Injectable()
class MockAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<MockRequest>();
    req.user = resolveUser(req.headers.authorization);
    return true;
  }
}

@Injectable()
class MockDualAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<MockRequest>();
    // DualAuthGuard acepta bearer O cookie de sesión de visitante
    const auth =
      req.headers.authorization ?? req.headers['x-guiders-sid'] ?? undefined;
    req.user = resolveUser(auth);
    return true;
  }
}

@Injectable()
class MockOptionalAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<MockRequest>();
    try {
      req.user = resolveUser(req.headers.authorization);
    } catch {
      // OptionalAuthGuard no lanza error si no hay auth
      req.user = {
        id: VISITOR_ID,
        sub: VISITOR_ID,
        roles: ['visitor'],
        email: 'anonimo@ejemplo.com',
        companyId: COMPANY_ID,
      };
    }
    return true;
  }
}

@Injectable()
class MockRolesGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<MockRequest>();
    if (!req.user) {
      throw new ForbiddenException('Sin usuario autenticado');
    }
    return true;
  }
}

// ----------------------------------------------------------------
// Mock del aggregate Chat (para endpoints que llaman ChatResponseDto.fromDomain)
// ----------------------------------------------------------------
const NOW = new Date().toISOString();

function makeMockChatAggregate(overrides: Record<string, any> = {}) {
  const primitives = {
    id: CHAT_ID,
    status: 'PENDING',
    priority: 'NORMAL',
    channel: 'chat',
    visitorId: VISITOR_ID,
    companyId: COMPANY_ID,
    assignedCommercialId: null,
    availableCommercialIds: [],
    totalMessages: 1,
    lastMessageContent: 'Hola, necesito información sobre sus productos',
    lastMessageDate: NOW,
    firstResponseTime: null,
    closedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    visitorInfo: {
      name: 'Ana García',
      email: 'ana@ejemplo.com',
      phone: null,
      location: null,
      additionalData: {},
    },
    metadata: {
      department: 'ventas',
      source: 'website',
      tags: [],
    },
    ...overrides,
  };
  return { toPrimitives: () => primitives };
}

// Mock del user object que devuelve FindUserByIdQuery
const MOCK_COMMERCIAL_USER = {
  name: { value: 'Carlos Comercial' },
  avatarUrl: { getOrNull: () => null },
};

// ----------------------------------------------------------------
// Datos mock que devolverán los buses
// ----------------------------------------------------------------
const MOCK_CHAT_RESPONSE = {
  id: CHAT_ID,
  status: 'PENDING',
  priority: 'NORMAL',
  channel: 'chat',
  visitorId: VISITOR_ID,
  companyId: COMPANY_ID,
  assignedCommercialId: null,
  totalMessages: 1,
  unreadMessagesCount: 1,
  lastMessageContent: 'Hola, necesito información sobre sus productos',
  lastMessageDate: new Date().toISOString(),
  visitorInfo: {
    id: VISITOR_ID,
    name: 'Ana García',
    email: 'ana@ejemplo.com',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_UNREAD_MESSAGES = [
  {
    id: MESSAGE_ID_2,
    chatId: CHAT_ID,
    senderId: VISITOR_ID,
    content: '¿Siguen disponibles?',
    type: 'text',
    isInternal: false,
    isRead: false,
    sentAt: new Date().toISOString(),
  },
];

const MOCK_MESSAGES_LIST = {
  messages: [
    {
      id: MESSAGE_ID_1,
      chatId: CHAT_ID,
      senderId: VISITOR_ID,
      content: 'Hola, necesito información sobre sus productos',
      type: 'text',
      isInternal: false,
      isRead: true,
      sentAt: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: MESSAGE_ID_2,
      chatId: CHAT_ID,
      senderId: VISITOR_ID,
      content: '¿Siguen disponibles?',
      type: 'text',
      isInternal: false,
      isRead: false,
      sentAt: new Date().toISOString(),
    },
  ],
  total: 2,
  hasMore: false,
  nextCursor: null,
};

// ----------------------------------------------------------------
// Suite principal
// ----------------------------------------------------------------
describe('Flujo visitante → comercial (E2E)', () => {
  let app: INestApplication;
  let httpServer: App;
  let mockCommandBus: jest.Mocked<Pick<CommandBus, 'execute'>>;
  let mockQueryBus: jest.Mocked<Pick<QueryBus, 'execute'>>;

  beforeAll(async () => {
    mockCommandBus = { execute: jest.fn() };
    mockQueryBus = { execute: jest.fn() };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [ChatV2Controller, MessageV2Controller],
      providers: [
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: QueryBus, useValue: mockQueryBus },
        {
          provide: TokenVerifyService,
          useValue: { verifyToken: jest.fn() },
        },
        {
          provide: VisitorSessionAuthService,
          useValue: { validateVisitorSession: jest.fn() },
        },
        {
          provide: BffSessionAuthService,
          useValue: {
            extractBffSessionTokens: jest.fn().mockResolvedValue(null),
            validateBffSession: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(DualAuthGuard)
      .useClass(MockDualAuthGuard)
      .overrideGuard(OptionalAuthGuard)
      .useClass(MockOptionalAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==============================================================
  // PASO 1: El visitante crea el chat con su primer mensaje
  // ==============================================================
  describe('Paso 1 — El visitante abre un chat con su primer mensaje', () => {
    it('debe crear el chat y devolver chatId + messageId + posición en cola', async () => {
      mockCommandBus.execute.mockResolvedValueOnce({
        chatId: CHAT_ID,
        messageId: MESSAGE_ID_1,
        position: 1,
      });

      const response = await request(httpServer)
        .post('/v2/chats/with-message')
        .set('Authorization', VISITOR_BEARER)
        .send({
          firstMessage: {
            content: 'Hola, necesito información sobre sus productos',
            type: 'text',
          },
          visitorInfo: {
            name: 'Ana García',
            email: 'ana@ejemplo.com',
          },
          metadata: {
            source: 'website',
            initialUrl: 'https://empresa.com/productos',
          },
        })
        .expect(201);

      expect(response.body).toMatchObject({
        chatId: CHAT_ID,
        messageId: MESSAGE_ID_1,
        position: 1,
      });
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('debe rechazar la petición si falta el contenido del primer mensaje', async () => {
      await request(httpServer)
        .post('/v2/chats/with-message')
        .set('Authorization', VISITOR_BEARER)
        .send({
          firstMessage: {
            // content ausente — debe fallar con 400
            type: 'text',
          },
        })
        .expect(400);

      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('debe rechazar la petición si no hay autenticación', async () => {
      await request(httpServer)
        .post('/v2/chats/with-message')
        .send({
          firstMessage: { content: 'Hola', type: 'text' },
        })
        .expect(401);
    });
  });

  // ==============================================================
  // PASO 2: El comercial consulta su cola de chats y ve el nuevo
  // ==============================================================
  describe('Paso 2 — El comercial ve el chat entrante en su cola', () => {
    it('debe devolver la lista de chats con el chat del visitante', async () => {
      mockQueryBus.execute.mockResolvedValueOnce({
        chats: [MOCK_CHAT_RESPONSE],
        total: 1,
        hasMore: false,
        nextCursor: null,
      });

      // Los filtros se pasan como objeto JSON serializado en query, no como params planos
      const response = await request(httpServer)
        .get('/v2/chats?limit=20')
        .set('Authorization', COMMERCIAL_BEARER)
        .expect(200);

      expect(response.body.chats).toHaveLength(1);
      expect(response.body.chats[0]).toMatchObject({
        id: CHAT_ID,
        status: 'PENDING',
        visitorInfo: { name: 'Ana García' },
      });
      expect(mockQueryBus.execute).toHaveBeenCalledTimes(1);
    });

    it('debe devolver lista vacía si no hay chats pendientes', async () => {
      mockQueryBus.execute.mockResolvedValueOnce({
        chats: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
      });

      const response = await request(httpServer)
        .get('/v2/chats?limit=20')
        .set('Authorization', COMMERCIAL_BEARER)
        .expect(200);

      expect(response.body.chats).toHaveLength(0);
    });
  });

  // ==============================================================
  // PASO 3: El comercial se asigna el chat
  // ==============================================================
  describe('Paso 3 — El comercial asigna el chat a sí mismo', () => {
    it('debe asignar el chat al comercial correctamente', async () => {
      // assignChat hace: commandBus → queryBus(GetChatById) → queryBus(FindUserById)
      mockCommandBus.execute.mockResolvedValueOnce(
        ok({ assignedCommercialId: COMMERCIAL_ID }),
      );
      mockQueryBus.execute
        .mockResolvedValueOnce(
          ok(
            makeMockChatAggregate({
              assignedCommercialId: COMMERCIAL_ID,
              status: 'ASSIGNED',
            }),
          ),
        )
        .mockResolvedValueOnce(MOCK_COMMERCIAL_USER);

      const response = await request(httpServer)
        .put(`/v2/chats/${CHAT_ID}/assign/${COMMERCIAL_ID}`)
        .set('Authorization', COMMERCIAL_BEARER)
        .expect(200);

      expect(response.body).toMatchObject({
        id: CHAT_ID,
        assignedCommercialId: COMMERCIAL_ID,
      });
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(mockQueryBus.execute).toHaveBeenCalledTimes(2);
    });

    it('debe rechazar la asignación si no es comercial/admin', async () => {
      // Sin autenticación → 401
      await request(httpServer)
        .put(`/v2/chats/${CHAT_ID}/assign/${COMMERCIAL_ID}`)
        .expect(401);
    });
  });

  // ==============================================================
  // PASO 4: El visitante envía un segundo mensaje
  // ==============================================================
  describe('Paso 4 — El visitante envía un segundo mensaje', () => {
    it('debe enviar el mensaje y devolver confirmación', async () => {
      mockCommandBus.execute.mockResolvedValueOnce({
        messageId: MESSAGE_ID_2,
        chatId: CHAT_ID,
        sentAt: new Date().toISOString(),
      });

      const response = await request(httpServer)
        .post('/v2/messages')
        .set('Authorization', VISITOR_BEARER)
        .send({
          chatId: CHAT_ID,
          content: '¿Siguen disponibles?',
          type: 'text',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        messageId: MESSAGE_ID_2,
        chatId: CHAT_ID,
      });
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);

      // SendMessageCommand: chatId y senderId son propiedades top-level
      const commandArg = mockCommandBus.execute.mock.calls[0][0] as any;
      expect(commandArg.chatId).toBe(CHAT_ID);
      expect(commandArg.senderId).toBe(VISITOR_ID);
    });

    it('debe rechazar mensajes con chatId inválido (no UUID)', async () => {
      await request(httpServer)
        .post('/v2/messages')
        .set('Authorization', VISITOR_BEARER)
        .send({
          chatId: 'no-es-un-uuid',
          content: 'Hola',
          type: 'text',
        })
        .expect(400);

      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('debe rechazar mensajes sin contenido', async () => {
      await request(httpServer)
        .post('/v2/messages')
        .set('Authorization', VISITOR_BEARER)
        .send({
          chatId: CHAT_ID,
          // content ausente
          type: 'text',
        })
        .expect(400);
    });

    it('debe rechazar mensajes con tipo inválido', async () => {
      await request(httpServer)
        .post('/v2/messages')
        .set('Authorization', VISITOR_BEARER)
        .send({
          chatId: CHAT_ID,
          content: 'Hola',
          type: 'video', // tipo no permitido
        })
        .expect(400);
    });
  });

  // ==============================================================
  // PASO 5: El comercial lee los mensajes no leídos (badge activo)
  // ==============================================================
  describe('Paso 5 — El comercial consulta los mensajes no leídos', () => {
    it('debe devolver los mensajes no leídos del visitante', async () => {
      mockQueryBus.execute.mockResolvedValueOnce(MOCK_UNREAD_MESSAGES);

      const response = await request(httpServer)
        .get(`/v2/messages/chat/${CHAT_ID}/unread`)
        .set('Authorization', COMMERCIAL_BEARER)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: MESSAGE_ID_2,
        chatId: CHAT_ID,
        senderId: VISITOR_ID,
        content: '¿Siguen disponibles?',
        isRead: false,
      });
    });

    it('debe devolver array vacío si no hay mensajes no leídos', async () => {
      mockQueryBus.execute.mockResolvedValueOnce([]);

      const response = await request(httpServer)
        .get(`/v2/messages/chat/${CHAT_ID}/unread`)
        .set('Authorization', COMMERCIAL_BEARER)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('debe devolver todos los mensajes del chat (historial completo)', async () => {
      mockQueryBus.execute.mockResolvedValueOnce(MOCK_MESSAGES_LIST);

      const response = await request(httpServer)
        .get(`/v2/messages/chat/${CHAT_ID}`)
        .set('Authorization', COMMERCIAL_BEARER)
        .expect(200);

      expect(response.body.messages).toHaveLength(2);
      expect(response.body.total).toBe(2);
      // El primero es el del visitante, el segundo también
      expect(response.body.messages[0].senderId).toBe(VISITOR_ID);
    });
  });

  // ==============================================================
  // PASO 6: El comercial responde al visitante
  // ==============================================================
  describe('Paso 6 — El comercial responde con un mensaje', () => {
    it('debe enviar la respuesta del comercial correctamente', async () => {
      mockCommandBus.execute.mockResolvedValueOnce({
        messageId: MESSAGE_ID_3,
        chatId: CHAT_ID,
        sentAt: new Date().toISOString(),
      });

      const response = await request(httpServer)
        .post('/v2/messages')
        .set('Authorization', COMMERCIAL_BEARER)
        .send({
          chatId: CHAT_ID,
          content:
            'Hola Ana, claro que sí. ¿En qué productos estás interesada?',
          type: 'text',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        messageId: MESSAGE_ID_3,
        chatId: CHAT_ID,
      });

      const commandArg = mockCommandBus.execute.mock.calls[0][0] as any;
      expect(commandArg.senderId).toBe(COMMERCIAL_ID);
    });

    it('debe permitir al comercial enviar mensajes internos', async () => {
      mockCommandBus.execute.mockResolvedValueOnce({
        messageId: MESSAGE_ID_3,
        chatId: CHAT_ID,
        sentAt: new Date().toISOString(),
      });

      await request(httpServer)
        .post('/v2/messages')
        .set('Authorization', COMMERCIAL_BEARER)
        .send({
          chatId: CHAT_ID,
          content: 'Nota interna: revisar historial del cliente',
          type: 'text',
          isInternal: true,
        })
        .expect(201);

      // isInternal se pasa dentro de messageData al SendMessageCommand
      const commandArg = mockCommandBus.execute.mock.calls[0][0] as any;
      expect(commandArg.messageData?.isInternal).toBe(true);
    });
  });

  // ==============================================================
  // PASO 7: El comercial marca mensajes como leídos
  // ==============================================================
  describe('Paso 7 — El comercial marca los mensajes como leídos', () => {
    it('debe marcar los mensajes indicados como leídos', async () => {
      mockCommandBus.execute.mockResolvedValueOnce({
        success: true,
        markedCount: 2,
      });

      const response = await request(httpServer)
        .put('/v2/messages/mark-as-read')
        .set('Authorization', COMMERCIAL_BEARER)
        .send({
          messageIds: [MESSAGE_ID_1, MESSAGE_ID_2],
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        markedCount: 2,
      });
    });

    it('debe aceptar array vacío sin error (no hay restricción mínima)', async () => {
      mockCommandBus.execute.mockResolvedValueOnce({
        success: true,
        markedCount: 0,
      });

      // MarkAsReadDto no tiene @ArrayMinSize — array vacío es válido
      await request(httpServer)
        .put('/v2/messages/mark-as-read')
        .set('Authorization', COMMERCIAL_BEARER)
        .send({ messageIds: [] })
        .expect(200);
    });
  });

  // ==============================================================
  // PASO 8: El comercial resetea el contador de no leídos
  // ==============================================================
  describe('Paso 8 — El comercial resetea el badge de no leídos', () => {
    it('debe resetear unreadMessagesCount a 0 al abrir el chat', async () => {
      mockCommandBus.execute.mockResolvedValueOnce(ok(undefined));

      const response = await request(httpServer)
        .put(`/v2/chats/${CHAT_ID}/unread/reset`)
        .set('Authorization', COMMERCIAL_BEARER)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);

      const commandArg = mockCommandBus.execute.mock.calls[0][0] as any;
      expect(commandArg.chatId).toBe(CHAT_ID);
      expect(commandArg.requestedBy).toBe(COMMERCIAL_ID);
    });

    it('debe rechazar el reset si no es comercial/admin (solo visitante)', async () => {
      // El endpoint /unread/reset solo permite commercial/admin/supervisor.
      // Con el MockAuthGuard, un visitante obtiene roles: ['visitor'].
      // El MockRolesGuard en este test permite todo, pero la ausencia de auth → 401.
      await request(httpServer)
        .put(`/v2/chats/${CHAT_ID}/unread/reset`)
        .expect(401);
    });
  });

  // ==============================================================
  // PASO 9: El comercial obtiene el detalle final del chat
  // ==============================================================
  describe('Paso 9 — Estado final del chat', () => {
    it('debe devolver el chat con estado actualizado tras la conversación', async () => {
      // getChatById: queryBus(GetChatByIdQuery) → ok(aggregate) + queryBus(FindUserByIdQuery)
      const chatAggregate = makeMockChatAggregate({
        status: 'ASSIGNED',
        assignedCommercialId: COMMERCIAL_ID,
        totalMessages: 3,
      });
      mockQueryBus.execute
        .mockResolvedValueOnce(ok(chatAggregate))
        .mockResolvedValueOnce(MOCK_COMMERCIAL_USER);

      const response = await request(httpServer)
        .get(`/v2/chats/${CHAT_ID}`)
        .set('Authorization', COMMERCIAL_BEARER)
        .expect(200);

      expect(response.body).toMatchObject({
        id: CHAT_ID,
        status: 'ASSIGNED',
        assignedCommercialId: COMMERCIAL_ID,
        totalMessages: 3,
      });
    });

    it('debe devolver 404 si el chat no existe', async () => {
      // getChatById retorna err → controller lanza HttpException 404
      class ChatNotFoundError extends DomainError {
        constructor() {
          super('Chat no encontrado');
        }
      }

      mockQueryBus.execute.mockResolvedValueOnce(err(new ChatNotFoundError()));

      await request(httpServer)
        .get(`/v2/chats/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', COMMERCIAL_BEARER)
        .expect(404);
    });
  });
});
