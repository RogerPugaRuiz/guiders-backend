import { Test, TestingModule } from '@nestjs/testing';
import { NotifyOnParticipantAssignedToChatEventHandler } from '../notify-on-participant-assigned-to-chat.event-handler';
import { ParticipantAssignedEvent } from 'src/context/conversations/chat/domain/chat/events/participant-assigned.event';
import { NOTIFICATION, INotification } from '../../../domain/notification';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { Logger } from '@nestjs/common';

describe('NotifyOnParticipantAssignedToChatEventHandler', () => {
  let handler: NotifyOnParticipantAssignedToChatEventHandler;
  let mockNotificationService: Partial<INotification>;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Mock del servicio de notificaciones
    mockNotificationService = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    // Mock del método log del logger
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyOnParticipantAssignedToChatEventHandler,
        {
          provide: NOTIFICATION,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    handler = module.get<NotifyOnParticipantAssignedToChatEventHandler>(
      NotifyOnParticipantAssignedToChatEventHandler,
    );

    jest.clearAllMocks();
  });

  afterEach(() => {
    loggerLogSpy.mockRestore();
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    it('debe enviar notificación al participante recién asignado al chat', async () => {
      // Arrange: Preparar el evento con datos de prueba
      const chatId = Uuid.random().value;
      const newParticipantId = Uuid.random().value;
      const visitorId = Uuid.random().value;
      const createdAt = new Date();
      
      const chat = {
        id: chatId,
        participants: [
          {
            id: newParticipantId,
            name: 'Nuevo Comercial',
            isCommercial: true,
            isVisitor: false,
            isOnline: true,
            assignedAt: new Date(),
            lastSeenAt: null,
            isViewing: false,
            isTyping: false,
          },
          {
            id: visitorId,
            name: 'Visitante',
            isCommercial: false,
            isVisitor: true,
            isOnline: true,
            assignedAt: new Date(),
            lastSeenAt: null,
            isViewing: false,
            isTyping: false,
          }
        ],
        status: 'active',
        lastMessage: null,
        lastMessageAt: null,
        createdAt: createdAt,
      };
      
      const newParticipant = {
        id: newParticipantId,
        name: 'Nuevo Comercial',
        isCommercial: true,
        isVisitor: false,
        isOnline: true,
        assignedAt: new Date(),
        lastSeenAt: null,
        isViewing: false,
        isTyping: false,
      };

      const event = new ParticipantAssignedEvent({
        chat,
        newParticipant,
      });

      // Act: Ejecutar el handler
      await handler.handle(event);

      // Assert: Verificar que se llamó al servicio de notificaciones para el nuevo participante
      expect(mockNotificationService.notify).toHaveBeenCalledTimes(1);
      
      expect(mockNotificationService.notify).toHaveBeenCalledWith({
        payload: { chat },
        recipientId: newParticipantId,
        type: 'commercial:incoming-chats',
      });
      
      // Verificar que se registró el log
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Participant assigned to chat: ${chatId}, new participant: ${newParticipantId}`),
      );
    });
  });
});