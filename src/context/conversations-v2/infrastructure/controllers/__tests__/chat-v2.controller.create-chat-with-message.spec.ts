import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ChatV2Controller } from '../chat-v2.controller';
import { CreateChatWithMessageCommand } from '../../../application/commands/create-chat-with-message.command';
import { AuthGuard } from 'src/context/shared/infrastructure/guards/auth.guard';
import { RolesGuard } from 'src/context/shared/infrastructure/guards/role.guard';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';
import { VisitorSessionAuthService } from 'src/context/shared/infrastructure/services/visitor-session-auth.service';

describe('ChatV2Controller - createChatWithMessage', () => {
  let app: INestApplication;
  let commandBus: CommandBus;
  let controller: ChatV2Controller;

  const mockUser = {
    id: 'visitor-123',
    roles: ['visitor'],
    username: 'test-visitor',
    email: 'visitor@test.com',
  };

  beforeEach(async () => {
    const mockCommandBus = {
      execute: jest.fn(),
    };

    const mockQueryBus = {
      execute: jest.fn(),
    };

    const mockAuthGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const mockRolesGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const mockTokenVerifyService = {
      verifyToken: jest.fn(),
    };

    const mockVisitorSessionAuthService = {
      authenticateVisitor: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatV2Controller],
      providers: [
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
        {
          provide: TokenVerifyService,
          useValue: mockTokenVerifyService,
        },
        {
          provide: VisitorSessionAuthService,
          useValue: mockVisitorSessionAuthService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = module.createNestApplication();

    // Mock del user en el request
    app.use((req: any, res, next) => {
      req.user = mockUser;
      next();
    });

    await app.init();

    commandBus = module.get<CommandBus>(CommandBus);
    controller = module.get<ChatV2Controller>(ChatV2Controller);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /v2/chats/with-message', () => {
    it('debe crear un chat con primer mensaje exitosamente', async () => {
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

      const expectedResult = {
        chatId: 'chat-456',
        messageId: 'msg-789',
        position: 1,
      };

      (commandBus.execute as jest.Mock).mockResolvedValue(expectedResult);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/v2/chats/with-message')
        .send(createChatWithMessageDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResult);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(CreateChatWithMessageCommand),
      );

      const executedCommand = (commandBus.execute as jest.Mock).mock
        .calls[0][0];
      expect(executedCommand).toBeInstanceOf(CreateChatWithMessageCommand);
      expect(executedCommand.visitorId).toBe(mockUser.id);
      expect(executedCommand.firstMessage.content).toBe(
        createChatWithMessageDto.firstMessage.content,
      );
      expect(executedCommand.firstMessage.type).toBe('text');
      expect(executedCommand.visitorInfo).toEqual(
        createChatWithMessageDto.visitorInfo,
      );
      expect(executedCommand.metadata).toEqual(
        createChatWithMessageDto.metadata,
      );
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

      const expectedResult = {
        chatId: 'chat-457',
        messageId: 'msg-790',
        position: 2,
      };

      (commandBus.execute as jest.Mock).mockResolvedValue(expectedResult);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/v2/chats/with-message')
        .send(createChatWithMessageDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResult);

      const executedCommand = (commandBus.execute as jest.Mock).mock
        .calls[0][0];
      expect(executedCommand.firstMessage.attachment).toEqual(
        createChatWithMessageDto.firstMessage.attachment,
      );
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
      await request(app.getHttpServer())
        .post('/v2/chats/with-message')
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
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
      await request(app.getHttpServer())
        .post('/v2/chats/with-message')
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('debe usar tipo de mensaje por defecto como text', async () => {
      // Arrange
      const createChatWithMessageDto = {
        firstMessage: {
          content: 'Mensaje sin tipo especificado',
        },
      };

      const expectedResult = {
        chatId: 'chat-458',
        messageId: 'msg-791',
        position: 1,
      };

      (commandBus.execute as jest.Mock).mockResolvedValue(expectedResult);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/v2/chats/with-message')
        .send(createChatWithMessageDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResult);

      const executedCommand = (commandBus.execute as jest.Mock).mock
        .calls[0][0];
      expect(executedCommand.firstMessage.type).toBe('text');
    });

    it('debe manejar errores del command bus', async () => {
      // Arrange
      const createChatWithMessageDto = {
        firstMessage: {
          content: 'Test message',
        },
      };

      const error = new Error('Error en la base de datos');
      (commandBus.execute as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await request(app.getHttpServer())
        .post('/v2/chats/with-message')
        .send(createChatWithMessageDto)
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('debe crear un chat con mensaje e información completa', async () => {
      // Arrange
      const createChatWithMessageDto = {
        firstMessage: {
          content: 'Necesito ayuda urgente con mi pedido',
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

      const expectedResult = {
        chatId: 'chat-459',
        messageId: 'msg-792',
        position: 3,
      };

      (commandBus.execute as jest.Mock).mockResolvedValue(expectedResult);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/v2/chats/with-message')
        .send(createChatWithMessageDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResult);

      const executedCommand = (commandBus.execute as jest.Mock).mock
        .calls[0][0];
      expect(executedCommand.visitorInfo).toEqual(
        createChatWithMessageDto.visitorInfo,
      );
      expect(executedCommand.metadata).toEqual(
        createChatWithMessageDto.metadata,
      );
    });
  });

  describe('createChatWithMessage method (unit test)', () => {
    it('debe crear comando correctamente con datos del usuario autenticado', async () => {
      // Arrange
      const createChatWithMessageDto = {
        firstMessage: {
          content: 'Test message',
          type: 'text',
        },
        visitorInfo: { name: 'Test User' },
        metadata: { department: 'test' },
      };

      const mockRequest = { user: mockUser };
      const expectedResult = {
        chatId: 'chat-123',
        messageId: 'msg-456',
        position: 1,
      };

      (commandBus.execute as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.createChatWithMessage(
        createChatWithMessageDto,
        mockRequest as any,
      );

      // Assert
      expect(result).toEqual(expectedResult);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorId: mockUser.id,
          firstMessage: {
            content: createChatWithMessageDto.firstMessage.content,
            type: 'text',
            attachment: undefined,
          },
          visitorInfo: createChatWithMessageDto.visitorInfo,
          metadata: createChatWithMessageDto.metadata,
        }),
      );
    });

    it('debe manejar datos opcionales faltantes', async () => {
      // Arrange
      const createChatWithMessageDto = {
        firstMessage: {
          content: 'Only required data',
        },
      };

      const mockRequest = { user: mockUser };
      const expectedResult = {
        chatId: 'chat-124',
        messageId: 'msg-457',
        position: 1,
      };

      (commandBus.execute as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.createChatWithMessage(
        createChatWithMessageDto,
        mockRequest as any,
      );

      // Assert
      expect(result).toEqual(expectedResult);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorId: mockUser.id,
          firstMessage: {
            content: 'Only required data',
            type: 'text',
            attachment: undefined,
          },
          visitorInfo: undefined,
          metadata: undefined,
        }),
      );
    });
  });
});
