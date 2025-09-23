import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ChatV2Controller } from '../chat-v2.controller';
import { JoinWaitingRoomCommand } from '../../../application/commands/join-waiting-room.command';
import { AuthGuard } from 'src/context/shared/infrastructure/guards/auth.guard';
import { RolesGuard } from 'src/context/shared/infrastructure/guards/role.guard';
import { OptionalAuthGuard } from 'src/context/shared/infrastructure/guards/optional-auth.guard';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';
import { VisitorSessionAuthService } from 'src/context/shared/infrastructure/services/visitor-session-auth.service';
import { BffSessionAuthService } from 'src/context/shared/infrastructure/services/bff-session-auth.service';

describe('ChatV2Controller - createChat', () => {
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

    const mockOptionalAuthGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const mockTokenVerifyService = {
      verifyToken: jest.fn(),
    };

    const mockVisitorSessionAuthService = {
      authenticateVisitor: jest.fn(),
    };

    const mockBffSessionAuthService = {
      extractBffSessionTokens: jest.fn(),
      validateBffSession: jest.fn(),
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
        {
          provide: BffSessionAuthService,
          useValue: mockBffSessionAuthService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .overrideGuard(OptionalAuthGuard)
      .useValue(mockOptionalAuthGuard)
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

  describe('POST /v2/chats', () => {
    it('debe crear un chat exitosamente con datos mínimos', async () => {
      // Arrange
      const expectedResult = {
        chatId: 'chat-456',
        position: 1,
      };

      (commandBus.execute as jest.Mock).mockResolvedValue(expectedResult);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/v2/chats')
        .send({})
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResult);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(JoinWaitingRoomCommand),
      );
    });

    it('debe crear un chat con información completa del visitante', async () => {
      // Arrange
      const createChatDto = {
        visitorInfo: {
          name: 'Juan Pérez',
          email: 'juan@example.com',
          phone: '+1234567890',
          location: 'Madrid, España',
          additionalData: {
            company: 'Acme Corp',
            ipAddress: '192.168.1.1',
          },
        },
        metadata: {
          department: 'ventas',
          source: 'website',
          initialUrl: 'https://example.com/productos',
          userAgent: 'Mozilla/5.0 Test Browser',
          referrer: 'https://google.com',
          tags: {
            utm_source: 'google',
            campaign: 'summer2024',
          },
          customFields: {
            priority_level: 'high',
            product_interest: 'premium',
          },
        },
      };

      const expectedResult = {
        chatId: 'chat-789',
        position: 2,
      };

      (commandBus.execute as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const response = await request(app.getHttpServer())
        .post('/v2/chats')
        .send(createChatDto)
        .expect(HttpStatus.CREATED);

      // Assert
      expect(response.body).toEqual(expectedResult);

      const executedCommand = (commandBus.execute as jest.Mock).mock
        .calls[0][0];
      expect(executedCommand).toBeInstanceOf(JoinWaitingRoomCommand);
      expect(executedCommand.visitorId).toBe(mockUser.id);
      expect(executedCommand.visitorInfo).toEqual(createChatDto.visitorInfo);
      expect(executedCommand.metadata).toEqual(createChatDto.metadata);
    });

    it('debe manejar errores del command bus', async () => {
      // Arrange
      const error = new Error('Error en la base de datos');
      (commandBus.execute as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await request(app.getHttpServer())
        .post('/v2/chats')
        .send({})
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('debe procesar solicitudes con datos válidos', async () => {
      // Arrange
      const expectedResult = {
        chatId: 'chat-124',
        position: 1,
      };

      (commandBus.execute as jest.Mock).mockResolvedValue(expectedResult);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/v2/chats')
        .send({})
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResult);
    });

    it('debe validar correctamente los datos de entrada', async () => {
      // Arrange
      const validDto = {
        visitorInfo: {
          name: 'Test User',
          email: 'test@example.com',
        },
        metadata: {
          department: 'test',
        },
      };

      const expectedResult = {
        chatId: 'chat-125',
        position: 1,
      };

      (commandBus.execute as jest.Mock).mockResolvedValue(expectedResult);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/v2/chats')
        .send(validDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResult);
    });
  });

  describe('createChat method (unit test)', () => {
    it('debe crear comando correctamente con datos del usuario autenticado', async () => {
      // Arrange
      const createChatDto = {
        visitorInfo: { name: 'Test User' },
        metadata: { department: 'test' },
      };

      const mockRequest = { user: mockUser };
      const expectedResult = { chatId: 'chat-123', position: 1 };

      (commandBus.execute as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.createChat(
        createChatDto,
        mockRequest as any,
      );

      // Assert
      expect(result).toEqual(expectedResult);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorId: mockUser.id,
          visitorInfo: createChatDto.visitorInfo,
          metadata: createChatDto.metadata,
        }),
      );
    });

    it('debe usar valores por defecto cuando no se proporciona DTO', async () => {
      // Arrange
      const mockRequest = { user: mockUser };
      const expectedResult = { chatId: 'chat-124', position: 1 };

      (commandBus.execute as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.createChat({}, mockRequest as any);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorId: mockUser.id,
          visitorInfo: {},
          metadata: {},
        }),
      );
    });
  });
});
