import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ForbiddenException,
  ExecutionContext,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { ChatV2Controller } from '../src/context/conversations-v2/infrastructure/controllers/chat-v2.controller';
import {
  CqrsModule,
  CommandBus,
  ICommandHandler,
  CommandHandler,
} from '@nestjs/cqrs';
import { AuthGuard } from '../src/context/shared/infrastructure/guards/auth.guard';
import { RolesGuard } from '../src/context/shared/infrastructure/guards/role.guard';
import { OptionalAuthGuard } from '../src/context/shared/infrastructure/guards/optional-auth.guard';
import { CreateChatWithMessageCommand } from '../src/context/conversations-v2/application/commands/create-chat-with-message.command';
import { TokenVerifyService } from '../src/context/shared/infrastructure/token-verify.service';
import { VisitorSessionAuthService } from '../src/context/shared/infrastructure/services/visitor-session-auth.service';

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

// Mock Command Handler para CreateChatWithMessageCommand
@Injectable()
@CommandHandler(CreateChatWithMessageCommand)
class CreateChatWithMessageCommandHandler
  implements ICommandHandler<CreateChatWithMessageCommand>
{
  execute(
    _command: CreateChatWithMessageCommand,
  ): Promise<{ chatId: string; messageId: string; position: number }> {
    // Mock response basado en los datos del command
    const response = {
      chatId: `chat-${Date.now()}`,
      messageId: `msg-${Date.now()}`,
      position: 1,
    };

    return Promise.resolve(response);
  }
}

// Guards mock que permiten todas las requests durante testing
@Injectable()
export class MockAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MockRequest>();

    // Simular diferentes tipos de usuarios basado en el header
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException(
        'No se proporcionó token de autorización',
      );
    }

    // Simular diferentes usuarios basado en el token
    if (authHeader.includes('visitor-token')) {
      request.user = {
        id: 'visitor-123',
        sub: 'visitor-123',
        roles: ['visitor'],
        username: 'test-visitor',
        email: 'visitor@test.com',
      };
    } else if (authHeader.includes('commercial-token')) {
      request.user = {
        id: 'commercial-456',
        sub: 'commercial-456',
        roles: ['commercial'],
        username: 'test-commercial',
        email: 'commercial@test.com',
      };
    } else if (authHeader.includes('admin-token')) {
      request.user = {
        id: 'admin-789',
        sub: 'admin-789',
        roles: ['admin'],
        username: 'test-admin',
        email: 'admin@test.com',
      };
    } else {
      throw new UnauthorizedException('Token de autorización inválido');
    }

    return true;
  }
}

@Injectable()
export class MockRolesGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MockRequest>();

    if (!request.user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // En modo test, permitir todas las operaciones
    return true;
  }
}

@Injectable()
export class MockOptionalAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MockRequest>();
    const authHeader = request.headers.authorization;

    // Si no hay auth, permitir acceso (opcional)
    if (!authHeader) {
      return true;
    }

    // Si hay token inválido, rechazar
    if (authHeader.includes('invalid-token')) {
      throw new UnauthorizedException('Token inválido');
    }

    // Si hay auth válido, validar y asignar usuario
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

describe('ChatV2Controller E2E - createChatWithMessage', () => {
  let app: INestApplication;
  let httpServer: App;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [ChatV2Controller],
      providers: [
        // Mock Command Handlers
        CreateChatWithMessageCommandHandler,
        // Mock Dependencies for Guards
        {
          provide: TokenVerifyService,
          useValue: {
            verifyToken: jest.fn().mockResolvedValue({
              sub: 'mock-visitor-id',
              roles: ['visitor'],
            }),
          },
        },
        {
          provide: VisitorSessionAuthService,
          useValue: {
            validateVisitorSession: jest.fn().mockResolvedValue(true),
          },
        },
        // Mock CommandBus and EventBus
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn().mockResolvedValue({
              chatId: 'mock-chat-id-123',
              messageId: 'mock-message-id-456',
              position: 1,
            }),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .overrideGuard(OptionalAuthGuard)
      .useClass(MockOptionalAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();

    // Habilitar pipes de validación para E2E tests
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

  describe('POST /v2/chats/with-message', () => {
    it('debe crear un chat con primer mensaje exitosamente (visitante)', async () => {
      // Arrange
      const createChatWithMessageDto = {
        firstMessage: {
          content: 'Hola, me gustaría información sobre sus productos',
          type: 'text',
        },
        visitorInfo: {
          name: 'Juan Pérez',
          email: 'juan@example.com',
        },
        metadata: {
          department: 'ventas',
          source: 'website',
        },
      };

      // Act & Assert
      const response = await request(httpServer)
        .post('/v2/chats/with-message')
        .set('Authorization', 'Bearer visitor-token')
        .send(createChatWithMessageDto)
        .expect(201);

      expect(response.body).toHaveProperty('chatId');
      expect(response.body).toHaveProperty('messageId');
      expect(response.body).toHaveProperty('position');
      expect(typeof response.body.chatId).toBe('string');
      expect(typeof response.body.messageId).toBe('string');
      expect(typeof response.body.position).toBe('number');
    });

    it('debe crear un chat con mensaje de archivo adjunto', async () => {
      // Arrange
      const createChatWithMessageDto = {
        firstMessage: {
          content: 'Por favor revisen este documento',
          type: 'file',
          attachment: {
            url: 'https://example.com/document.pdf',
            fileName: 'presupuesto.pdf',
            fileSize: 2048,
            mimeType: 'application/pdf',
          },
        },
        visitorInfo: {
          name: 'María García',
          email: 'maria@example.com',
        },
      };

      // Act & Assert
      const response = await request(httpServer)
        .post('/v2/chats/with-message')
        .set('Authorization', 'Bearer visitor-token')
        .send(createChatWithMessageDto)
        .expect(201);

      expect(response.body).toHaveProperty('chatId');
      expect(response.body).toHaveProperty('messageId');
      expect(response.body).toHaveProperty('position');
    });

    it('debe permitir crear chat a comerciales', async () => {
      // Arrange
      const createChatWithMessageDto = {
        firstMessage: {
          content: 'Mensaje de prueba desde comercial',
          type: 'text',
        },
      };

      // Act & Assert
      const response = await request(httpServer)
        .post('/v2/chats/with-message')
        .set('Authorization', 'Bearer commercial-token')
        .send(createChatWithMessageDto)
        .expect(201);

      expect(response.body).toHaveProperty('chatId');
      expect(response.body).toHaveProperty('messageId');
      expect(response.body).toHaveProperty('position');
    });

    it('debe permitir crear chat a administradores', async () => {
      // Arrange
      const createChatWithMessageDto = {
        firstMessage: {
          content: 'Mensaje de prueba desde admin',
          type: 'text',
        },
      };

      // Act & Assert
      const response = await request(httpServer)
        .post('/v2/chats/with-message')
        .set('Authorization', 'Bearer admin-token')
        .send(createChatWithMessageDto)
        .expect(201);

      expect(response.body).toHaveProperty('chatId');
      expect(response.body).toHaveProperty('messageId');
      expect(response.body).toHaveProperty('position');
    });

    it('debe fallar sin autenticación', async () => {
      // Arrange
      const createChatWithMessageDto = {
        firstMessage: {
          content: 'Mensaje sin auth',
          type: 'text',
        },
      };

      // Act & Assert
      await request(httpServer)
        .post('/v2/chats/with-message')
        .send(createChatWithMessageDto)
        .expect(401);
    });

    it('debe fallar con token inválido', async () => {
      // Arrange
      const createChatWithMessageDto = {
        firstMessage: {
          content: 'Mensaje con token inválido',
          type: 'text',
        },
      };

      // Act & Assert
      await request(httpServer)
        .post('/v2/chats/with-message')
        .set('Authorization', 'Bearer invalid-token')
        .send(createChatWithMessageDto)
        .expect(401);
    });

    it('debe validar que el primer mensaje es requerido', async () => {
      // Arrange
      const invalidDto = {
        visitorInfo: {
          name: 'Test User',
        },
        // falta firstMessage
      };

      // Act & Assert
      await request(httpServer)
        .post('/v2/chats/with-message')
        .set('Authorization', 'Bearer visitor-token')
        .send(invalidDto)
        .expect(400);
    });

    it('debe validar que el contenido del mensaje es requerido', async () => {
      // Arrange
      const invalidDto = {
        firstMessage: {
          type: 'text',
          // falta content
        },
        visitorInfo: {
          name: 'Test User',
        },
      };

      // Act & Assert
      await request(httpServer)
        .post('/v2/chats/with-message')
        .set('Authorization', 'Bearer visitor-token')
        .send(invalidDto)
        .expect(400);
    });

    it('debe aceptar tipos de mensaje válidos', async () => {
      // Test con diferentes tipos de mensaje
      const messageTypes = ['text', 'image', 'file'];

      for (const type of messageTypes) {
        const createChatWithMessageDto = {
          firstMessage: {
            content: `Mensaje de tipo ${type}`,
            type: type,
          },
        };

        await request(httpServer)
          .post('/v2/chats/with-message')
          .set('Authorization', 'Bearer visitor-token')
          .send(createChatWithMessageDto)
          .expect(201);
      }
    });

    it('debe validar tipos de mensaje inválidos', async () => {
      // Arrange
      const invalidDto = {
        firstMessage: {
          content: 'Mensaje con tipo inválido',
          type: 'invalid-type',
        },
      };

      // Act & Assert
      await request(httpServer)
        .post('/v2/chats/with-message')
        .set('Authorization', 'Bearer visitor-token')
        .send(invalidDto)
        .expect(400);
    });

    it('debe manejar información completa del visitante y metadata', async () => {
      // Arrange
      const createChatWithMessageDto = {
        firstMessage: {
          content: 'Mensaje con información completa',
          type: 'text',
        },
        visitorInfo: {
          name: 'Carlos Rodríguez',
          email: 'carlos@example.com',
          phone: '+34666777888',
          location: 'Barcelona, España',
          additionalData: {
            company: 'TechCorp',
            ipAddress: '192.168.1.100',
          },
        },
        metadata: {
          department: 'soporte',
          source: 'mobile_app',
          initialUrl: 'https://example.com/help',
          userAgent: 'Mozilla/5.0 Mobile',
          priority: 'HIGH',
          additionalData: {
            orderNumber: 'ORD-12345',
            customerType: 'premium',
          },
        },
      };

      // Act & Assert
      const response = await request(httpServer)
        .post('/v2/chats/with-message')
        .set('Authorization', 'Bearer visitor-token')
        .send(createChatWithMessageDto)
        .expect(201);

      expect(response.body).toHaveProperty('chatId');
      expect(response.body).toHaveProperty('messageId');
      expect(response.body).toHaveProperty('position');
    });

    it('debe funcionar con datos mínimos (solo mensaje)', async () => {
      // Arrange
      const createChatWithMessageDto = {
        firstMessage: {
          content: 'Solo mensaje mínimo',
        },
      };

      // Act & Assert
      const response = await request(httpServer)
        .post('/v2/chats/with-message')
        .set('Authorization', 'Bearer visitor-token')
        .send(createChatWithMessageDto)
        .expect(201);

      expect(response.body).toHaveProperty('chatId');
      expect(response.body).toHaveProperty('messageId');
      expect(response.body).toHaveProperty('position');
    });
  });
});
