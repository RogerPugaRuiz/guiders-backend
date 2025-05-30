import { Test, TestingModule } from '@nestjs/testing';
import { NotifyOnParticipantUnseenChatEventHandler } from '../notify-on-participant-unseen-chat.event-handler';
import { ParticipantUnseenAtEvent } from 'src/context/conversations/chat/domain/chat/events/participant-unseen-at.event';
import { NOTIFICATION, INotification } from '../../../domain/notification';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { Logger } from '@nestjs/common';

describe('NotifyOnParticipantUnseenChatEventHandler', () => {
  let handler: NotifyOnParticipantUnseenChatEventHandler;
  let mockNotificationService: Partial<INotification>;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Mock del servicio de notificaciones
    mockNotificationService = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    // Mock de los métodos del logger
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyOnParticipantUnseenChatEventHandler,
        {
          provide: NOTIFICATION,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    handler = module.get<NotifyOnParticipantUnseenChatEventHandler>(
      NotifyOnParticipantUnseenChatEventHandler,
    );

    jest.clearAllMocks();
  });

  afterEach(() => {
    loggerWarnSpy.mockRestore();
    loggerLogSpy.mockRestore();
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    it('debe enviar notificaciones a todos los participantes excepto al que marcó como no visto el chat', async () => {
      // Arrange: Preparar el evento con datos de prueba
      const chatId = Uuid.random().value;
      const participantId = Uuid.random().value;
      const otherParticipantId1 = Uuid.random().value;
      const otherParticipantId2 = Uuid.random().value;
      const unseenAt = new Date();
      const createdAt = new Date();

      const event = new ParticipantUnseenAtEvent({
        attributes: {
          chat: {
            id: chatId,
            participants: [
              {
                id: participantId,
                name: 'Participant 1',
                isCommercial: false,
                isVisitor: true,
                isOnline: true,
                assignedAt: new Date(),
                lastSeenAt: null,
                isViewing: false,
                isTyping: false,
              },
              {
                id: otherParticipantId1,
                name: 'Participant 2',
                isCommercial: true,
                isVisitor: false,
                isOnline: true,
                assignedAt: new Date(),
                lastSeenAt: null,
                isViewing: false,
                isTyping: false,
              },
              {
                id: otherParticipantId2,
                name: 'Participant 3',
                isCommercial: true,
                isVisitor: false,
                isOnline: true,
                assignedAt: new Date(),
                lastSeenAt: null,
                isViewing: false,
                isTyping: false,
              },
            ],
            status: 'active',
            lastMessage: null,
            lastMessageAt: null,
            createdAt: createdAt,
          },
          participantUpdate: {
            id: participantId,
            previousSeen: null,
            previousIsViewing: false,
          },
        },
        timestamp: new Date().getTime(),
      });

      // Act: Ejecutar el handler
      await handler.handle(event);

      // Assert: Verificar que se llamó al servicio de notificaciones para cada participante excepto el que marcó como no visto
      expect(mockNotificationService.notify).toHaveBeenCalledTimes(2);
      
      // Verificar la primera notificación
      expect(mockNotificationService.notify).toHaveBeenNthCalledWith(
        1,
        {
          type: 'participant:unseen-chat',
          payload: event.params.attributes,
          recipientId: otherParticipantId1,
        },
      );
      
      // Verificar la segunda notificación
      expect(mockNotificationService.notify).toHaveBeenNthCalledWith(
        2,
        {
          type: 'participant:unseen-chat',
          payload: event.params.attributes,
          recipientId: otherParticipantId2,
        },
      );
      
      // Verificar que se loggeó correctamente
      expect(loggerLogSpy).toHaveBeenCalledTimes(2);
    });

    it('no debe enviar notificaciones si no hay más participantes en el chat', async () => {
      // Arrange: Preparar el evento con solo un participante
      const chatId = Uuid.random().value;
      const participantId = Uuid.random().value;
      const unseenAt = new Date();
      const createdAt = new Date();

      const event = new ParticipantUnseenAtEvent({
        attributes: {
          chat: {
            id: chatId,
            participants: [
              {
                id: participantId,
                name: 'Participant 1',
                isCommercial: false,
                isVisitor: true,
                isOnline: true,
                assignedAt: new Date(),
                lastSeenAt: null,
                isViewing: false,
                isTyping: false,
              },
            ],
            status: 'active',
            lastMessage: null,
            lastMessageAt: null,
            createdAt: createdAt,
          },
          participantUpdate: {
            id: participantId,
            previousSeen: null,
            previousIsViewing: false,
          },
        },
        timestamp: new Date().getTime(),
      });

      // Act: Ejecutar el handler
      await handler.handle(event);

      // Assert: Verificar que no se llamó al servicio de notificaciones y se registró una advertencia
      expect(mockNotificationService.notify).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No recipients found for participant unseen chat event with ID'),
      );
    });
  });
});