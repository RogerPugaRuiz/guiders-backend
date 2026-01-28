/**
 * Tests unitarios para NotifyCommercialCommandHandler
 * Verifica el flujo de escalación: WebSocket si online, Email si offline
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { NotifyCommercialCommandHandler } from '../notify-commercial-command.handler';
import { NotifyCommercialCommand } from '../notify-commercial.command';
import { CHAT_V2_REPOSITORY } from '../../../../conversations-v2/domain/chat.repository';
import { COMMERCIAL_CONNECTION_DOMAIN_SERVICE } from '../../../../commercial/domain/commercial-connection.domain-service';
import { USER_ACCOUNT_REPOSITORY } from '../../../../auth/auth-user/domain/user-account.repository';
import { EMAIL_SENDER_SERVICE } from '../../../../shared/domain/email/email-sender.service';
import { ok, err } from '../../../../shared/domain/result';
import { DomainError } from '../../../../shared/domain/domain.error';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';

class ChatNotFoundError extends DomainError {
  constructor(chatId: string) {
    super(`Chat con id ${chatId} no encontrado`);
  }
}

describe('NotifyCommercialCommandHandler', () => {
  let handler: NotifyCommercialCommandHandler;
  let mockChatRepository: jest.Mocked<any>;
  let mockConnectionService: jest.Mocked<any>;
  let mockUserAccountRepository: jest.Mocked<any>;
  let mockEmailSender: jest.Mocked<any>;
  let mockWsGateway: jest.Mocked<any>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;
  let mockConfigService: jest.Mocked<ConfigService>;

  // UUIDs válidos para los tests
  const chatId = Uuid.random().value;
  const companyId = Uuid.random().value;
  const visitorId = Uuid.random().value;
  const commercialId1 = Uuid.random().value;
  const commercialId2 = Uuid.random().value;

  beforeEach(async () => {
    mockChatRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockConnectionService = {
      isCommercialOnline: jest.fn(),
    };

    mockUserAccountRepository = {
      findById: jest.fn(),
      findByCompanyId: jest.fn(),
    };

    mockEmailSender = {
      sendEmail: jest.fn(),
    };

    mockWsGateway = {
      emitToRoom: jest.fn(),
    };

    mockEventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue({
        commit: jest.fn(),
      }),
    } as any;

    mockConfigService = {
      get: jest.fn().mockReturnValue('https://app.guiders.io'),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyCommercialCommandHandler,
        {
          provide: CHAT_V2_REPOSITORY,
          useValue: mockChatRepository,
        },
        {
          provide: COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
          useValue: mockConnectionService,
        },
        {
          provide: USER_ACCOUNT_REPOSITORY,
          useValue: mockUserAccountRepository,
        },
        {
          provide: EMAIL_SENDER_SERVICE,
          useValue: mockEmailSender,
        },
        {
          provide: 'WEBSOCKET_GATEWAY',
          useValue: mockWsGateway,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    handler = module.get<NotifyCommercialCommandHandler>(
      NotifyCommercialCommandHandler,
    );
  });

  describe('execute', () => {
    const createCommand = (
      message = 'El visitante necesita ayuda con financiación',
      reason: 'cannot_answer' | 'visitor_requested' | 'complex_topic' | 'other' = 'cannot_answer',
    ) =>
      new NotifyCommercialCommand(
        chatId,
        companyId,
        visitorId,
        message,
        reason,
      );

    describe('cuando hay comercial asignado al chat', () => {
      it('debe notificar via WebSocket si el comercial está online', async () => {
        // Given
        const mockChat = {
          assignedCommercialId: {
            isPresent: () => true,
            get: () => ({ getValue: () => commercialId1 }),
          },
        };
        mockChatRepository.findById.mockResolvedValue(ok(mockChat));
        mockConnectionService.isCommercialOnline.mockResolvedValue(true);

        const command = createCommand();

        // When
        const result = await handler.execute(command);

        // Then
        expect(result.isOk()).toBe(true);
        expect(mockWsGateway.emitToRoom).toHaveBeenCalledWith(
          `commercial:${commercialId1}`,
          'chat:escalation-requested',
          expect.objectContaining({
            chatId,
            visitorId,
            companyId,
            message: 'El visitante necesita ayuda con financiación',
            reason: 'cannot_answer',
            chatUrl: `https://app.guiders.io/chats/${chatId}`,
          }),
        );
        expect(mockEmailSender.sendEmail).not.toHaveBeenCalled();
      });

      it('debe notificar via Email si el comercial está offline', async () => {
        // Given
        const mockChat = {
          assignedCommercialId: {
            isPresent: () => true,
            get: () => ({ getValue: () => commercialId1 }),
          },
        };
        const mockUserAccount = {
          email: { getValue: () => 'comercial@empresa.com' },
        };

        mockChatRepository.findById.mockResolvedValue(ok(mockChat));
        mockConnectionService.isCommercialOnline.mockResolvedValue(false);
        mockUserAccountRepository.findById.mockResolvedValue(mockUserAccount);
        mockEmailSender.sendEmail.mockResolvedValue(ok(undefined));

        const command = createCommand();

        // When
        const result = await handler.execute(command);

        // Then
        expect(result.isOk()).toBe(true);
        expect(mockWsGateway.emitToRoom).not.toHaveBeenCalled();
        expect(mockEmailSender.sendEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'comercial@empresa.com',
            subject: expect.stringContaining('Solicitud de atención'),
            html: expect.stringContaining('Abrir Chat'),
          }),
        );
      });
    });

    describe('cuando no hay comercial asignado', () => {
      it('debe notificar a todos los comerciales de la empresa', async () => {
        // Given
        const mockChat = {
          assignedCommercialId: {
            isPresent: () => false,
          },
        };

        mockChatRepository.findById.mockResolvedValue(ok(mockChat));
        // Mock findByCompanyId retorna todos los usuarios de la empresa
        mockUserAccountRepository.findByCompanyId.mockResolvedValue([
          {
            id: { getValue: () => commercialId1 },
            roles: { toPrimitives: () => ['commercial'] },
            email: { getValue: () => 'comercial1@empresa.com' },
          },
          {
            id: { getValue: () => commercialId2 },
            roles: { toPrimitives: () => ['commercial'] },
            email: { getValue: () => 'comercial2@empresa.com' },
          },
        ]);
        // Primer comercial online, segundo offline
        mockConnectionService.isCommercialOnline
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false);
        mockUserAccountRepository.findById.mockResolvedValue({
          email: { getValue: () => 'comercial2@empresa.com' },
        });
        mockEmailSender.sendEmail.mockResolvedValue(ok(undefined));

        const command = createCommand();

        // When
        const result = await handler.execute(command);

        // Then
        expect(result.isOk()).toBe(true);
        // Comercial 1: WebSocket (online)
        expect(mockWsGateway.emitToRoom).toHaveBeenCalledWith(
          `commercial:${commercialId1}`,
          'chat:escalation-requested',
          expect.any(Object),
        );
        // Comercial 2: Email (offline)
        expect(mockEmailSender.sendEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'comercial2@empresa.com',
          }),
        );
      });

      it('debe filtrar solo usuarios con rol comercial', async () => {
        // Given
        const mockChat = {
          assignedCommercialId: {
            isPresent: () => false,
          },
        };

        mockChatRepository.findById.mockResolvedValue(ok(mockChat));
        // Mock findByCompanyId retorna usuarios con diferentes roles
        mockUserAccountRepository.findByCompanyId.mockResolvedValue([
          {
            id: { getValue: () => commercialId1 },
            roles: { toPrimitives: () => ['commercial'] },
            email: { getValue: () => 'comercial1@empresa.com' },
          },
          {
            id: { getValue: () => Uuid.random().value },
            roles: { toPrimitives: () => ['admin'] }, // No es comercial
            email: { getValue: () => 'admin@empresa.com' },
          },
        ]);
        mockConnectionService.isCommercialOnline.mockResolvedValue(true);

        const command = createCommand();

        // When
        const result = await handler.execute(command);

        // Then
        expect(result.isOk()).toBe(true);
        // Solo notifica al comercial, no al admin
        expect(mockWsGateway.emitToRoom).toHaveBeenCalledTimes(1);
        expect(mockWsGateway.emitToRoom).toHaveBeenCalledWith(
          `commercial:${commercialId1}`,
          'chat:escalation-requested',
          expect.any(Object),
        );
      });

      it('debe retornar ok si no hay comerciales en la empresa', async () => {
        // Given
        const mockChat = {
          assignedCommercialId: {
            isPresent: () => false,
          },
        };

        mockChatRepository.findById.mockResolvedValue(ok(mockChat));
        // No hay usuarios en la empresa
        mockUserAccountRepository.findByCompanyId.mockResolvedValue([]);

        const command = createCommand();

        // When
        const result = await handler.execute(command);

        // Then
        expect(result.isOk()).toBe(true);
        expect(mockWsGateway.emitToRoom).not.toHaveBeenCalled();
        expect(mockEmailSender.sendEmail).not.toHaveBeenCalled();
      });

      it('debe retornar ok si hay usuarios pero ninguno con rol comercial', async () => {
        // Given
        const mockChat = {
          assignedCommercialId: {
            isPresent: () => false,
          },
        };

        mockChatRepository.findById.mockResolvedValue(ok(mockChat));
        // Solo usuarios con rol admin
        mockUserAccountRepository.findByCompanyId.mockResolvedValue([
          {
            id: { getValue: () => Uuid.random().value },
            roles: { toPrimitives: () => ['admin'] },
            email: { getValue: () => 'admin@empresa.com' },
          },
        ]);

        const command = createCommand();

        // When
        const result = await handler.execute(command);

        // Then
        expect(result.isOk()).toBe(true);
        expect(mockWsGateway.emitToRoom).not.toHaveBeenCalled();
        expect(mockEmailSender.sendEmail).not.toHaveBeenCalled();
      });
    });

    describe('manejo de errores', () => {
      it('debe continuar si el chat no se encuentra', async () => {
        // Given
        mockChatRepository.findById.mockResolvedValue(
          err(new ChatNotFoundError(chatId)),
        );
        // Aunque el chat no exista, busca comerciales de la empresa
        mockUserAccountRepository.findByCompanyId.mockResolvedValue([
          {
            id: { getValue: () => commercialId1 },
            roles: { toPrimitives: () => ['commercial'] },
            email: { getValue: () => 'comercial1@empresa.com' },
          },
        ]);
        mockConnectionService.isCommercialOnline.mockResolvedValue(true);

        const command = createCommand();

        // When
        const result = await handler.execute(command);

        // Then
        expect(result.isOk()).toBe(true);
        // Aún así intenta notificar a comerciales de la empresa
        expect(mockUserAccountRepository.findByCompanyId).toHaveBeenCalled();
        expect(mockWsGateway.emitToRoom).toHaveBeenCalled();
      });

      it('debe manejar error al obtener comerciales de la empresa', async () => {
        // Given
        mockChatRepository.findById.mockResolvedValue(
          err(new ChatNotFoundError(chatId)),
        );
        mockUserAccountRepository.findByCompanyId.mockRejectedValue(
          new Error('Database connection failed'),
        );

        const command = createCommand();

        // When
        const result = await handler.execute(command);

        // Then
        expect(result.isOk()).toBe(true);
        // No notifica a nadie pero no falla
        expect(mockWsGateway.emitToRoom).not.toHaveBeenCalled();
      });

      it('debe continuar si falla el envío de email', async () => {
        // Given
        const mockChat = {
          assignedCommercialId: {
            isPresent: () => true,
            get: () => ({ getValue: () => commercialId1 }),
          },
        };

        mockChatRepository.findById.mockResolvedValue(ok(mockChat));
        mockConnectionService.isCommercialOnline.mockResolvedValue(false);
        mockUserAccountRepository.findById.mockResolvedValue({
          email: { getValue: () => 'comercial@empresa.com' },
        });
        mockEmailSender.sendEmail.mockRejectedValue(
          new Error('SMTP connection failed'),
        );

        const command = createCommand();

        // When
        const result = await handler.execute(command);

        // Then
        expect(result.isOk()).toBe(true);
        // El resultado es ok aunque el email falle (graceful degradation)
      });

      it('debe retornar error si hay excepción inesperada', async () => {
        // Given
        mockChatRepository.findById.mockRejectedValue(
          new Error('MongoDB connection failed'),
        );
        mockUserAccountRepository.findByCompanyId.mockRejectedValue(
          new Error('Database connection failed'),
        );

        const command = createCommand();

        // When
        const result = await handler.execute(command);

        // Then
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.message).toContain('Error en escalación');
        }
      });
    });

    describe('generación de contenido', () => {
      it('debe incluir la URL del chat correcta', async () => {
        // Given
        const mockChat = {
          assignedCommercialId: {
            isPresent: () => true,
            get: () => ({ getValue: () => commercialId1 }),
          },
        };
        mockChatRepository.findById.mockResolvedValue(ok(mockChat));
        mockConnectionService.isCommercialOnline.mockResolvedValue(true);

        const command = createCommand();

        // When
        await handler.execute(command);

        // Then
        expect(mockWsGateway.emitToRoom).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.objectContaining({
            chatUrl: `https://app.guiders.io/chats/${chatId}`,
          }),
        );
      });

      it('debe usar URL por defecto si no hay APP_URL configurada', async () => {
        // Given
        mockConfigService.get.mockReturnValue(undefined);
        const mockChat = {
          assignedCommercialId: {
            isPresent: () => true,
            get: () => ({ getValue: () => commercialId1 }),
          },
        };
        mockChatRepository.findById.mockResolvedValue(ok(mockChat));
        mockConnectionService.isCommercialOnline.mockResolvedValue(true);

        const command = createCommand();

        // When
        await handler.execute(command);

        // Then
        expect(mockWsGateway.emitToRoom).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.objectContaining({
            chatUrl: `http://localhost:3000/chats/${chatId}`,
          }),
        );
      });

      it('debe incluir el motivo de escalación correcto', async () => {
        // Given
        const mockChat = {
          assignedCommercialId: {
            isPresent: () => true,
            get: () => ({ getValue: () => commercialId1 }),
          },
        };
        mockChatRepository.findById.mockResolvedValue(ok(mockChat));
        mockConnectionService.isCommercialOnline.mockResolvedValue(true);

        const command = new NotifyCommercialCommand(
          chatId,
          companyId,
          visitorId,
          'El visitante quiere hablar con alguien',
          'visitor_requested',
        );

        // When
        await handler.execute(command);

        // Then
        expect(mockWsGateway.emitToRoom).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.objectContaining({
            reason: 'visitor_requested',
          }),
        );
      });
    });

    describe('emisión de eventos', () => {
      it('debe emitir evento de dominio después de notificar', async () => {
        // Given
        const mockChat = {
          assignedCommercialId: {
            isPresent: () => true,
            get: () => ({ getValue: () => commercialId1 }),
          },
        };
        mockChatRepository.findById.mockResolvedValue(ok(mockChat));
        mockConnectionService.isCommercialOnline.mockResolvedValue(true);

        const command = createCommand();

        // When
        await handler.execute(command);

        // Then
        expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalled();
      });
    });
  });
});
