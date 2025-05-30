import { NotifyOnParticipantOnlineStatusUpdatedEventHandler } from '../notify-on-participant-online-status-updated.event-handler';
import { ParticipantOnlineStatusUpdatedEvent } from 'src/context/conversations/chat/domain/chat/events/participant-online-status-updated.event';
import { NOTIFICATION, INotification } from '../../../domain/notification';

describe('NotifyOnParticipantOnlineStatusUpdatedEventHandler', () => {
  let handler: NotifyOnParticipantOnlineStatusUpdatedEventHandler;
  let mockNotificationService: Partial<INotification>;
  let mockLogger: any;

  beforeEach(() => {
    // Crear mocks
    mockNotificationService = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Crear handler directamente
    handler = new NotifyOnParticipantOnlineStatusUpdatedEventHandler(
      mockNotificationService as INotification,
    );

    // Reemplazar el logger interno
    (handler as any).logger = mockLogger;
  });

  describe('handle', () => {
    it('debería notificar a otros participantes cuando se actualiza el estado online', async () => {
      // Arrange
      const updatedParticipantId = 'participant-1';
      const chatId = 'chat-123';

      const event = new ParticipantOnlineStatusUpdatedEvent({
        updatedParticipant: {
          id: updatedParticipantId,
          previousOnlineStatus: false,
        },
        chat: {
          id: chatId,
          status: 'active',
          lastMessage: 'Hello',
          lastMessageAt: new Date(),
          createdAt: new Date(),
          participants: [
            {
              id: updatedParticipantId,
              isOnline: true,
              name: 'Participant 1',
              isCommercial: false,
              isVisitor: true,
              assignedAt: new Date(),
              lastSeenAt: new Date(),
              isViewing: false,
              isTyping: false,
            },
            {
              id: 'participant-2',
              isOnline: false,
              name: 'Participant 2',
              isCommercial: true,
              isVisitor: false,
              assignedAt: new Date(),
              lastSeenAt: new Date(),
              isViewing: false,
              isTyping: false,
            },
            {
              id: 'participant-3',
              isOnline: false,
              name: 'Participant 3',
              isCommercial: true,
              isVisitor: false,
              assignedAt: new Date(),
              lastSeenAt: new Date(),
              isViewing: false,
              isTyping: false,
            },
          ],
        },
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockNotificationService.notify).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.notify).toHaveBeenNthCalledWith(1, {
        recipientId: 'participant-2',
        payload: {
          isOnline: true,
          participantId: updatedParticipantId,
        },
        type: 'participant:online-status-updated',
      });
      expect(mockNotificationService.notify).toHaveBeenNthCalledWith(2, {
        recipientId: 'participant-3',
        payload: {
          isOnline: true,
          participantId: updatedParticipantId,
        },
        type: 'participant:online-status-updated',
      });
    });

    it('debería manejar correctamente cuando el participante no se encuentra en el chat', async () => {
      // Arrange
      const updatedParticipantId = 'non-existent-participant';
      const chatId = 'chat-123';

      const event = new ParticipantOnlineStatusUpdatedEvent({
        updatedParticipant: {
          id: updatedParticipantId,
          previousOnlineStatus: false,
        },
        chat: {
          id: chatId,
          status: 'active',
          lastMessage: 'Hello',
          lastMessageAt: new Date(),
          createdAt: new Date(),
          participants: [
            {
              id: 'participant-1',
              isOnline: true,
              name: 'Participant 1',
              isCommercial: false,
              isVisitor: true,
              assignedAt: new Date(),
              lastSeenAt: new Date(),
              isViewing: false,
              isTyping: false,
            },
          ],
        },
      });

      // Acceder al logger mockeado para espiar el método warn
      const loggerInstance = (handler as any).logger;

      // Act
      await handler.handle(event);

      // Assert
      expect(mockNotificationService.notify).not.toHaveBeenCalled();
      expect(loggerInstance.warn).toHaveBeenCalledWith(
        expect.stringContaining(updatedParticipantId),
      );
    });
  });
});