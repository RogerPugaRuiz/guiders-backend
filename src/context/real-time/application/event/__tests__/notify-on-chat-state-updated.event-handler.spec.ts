import { NotifyOnChatStateUpdatedEventHandler } from '../notify-on-chat-state-updated.event-handler';
import { StatusUpdatedEvent } from 'src/context/conversations/chat/domain/chat/events/status-updated.event';
import { NOTIFICATION, INotification } from '../../../domain/notification';

describe('NotifyOnChatStateUpdatedEventHandler', () => {
  let handler: NotifyOnChatStateUpdatedEventHandler;
  let mockNotificationService: Partial<INotification>;

  beforeEach(() => {
    // Crear mocks
    mockNotificationService = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    // Crear handler directamente
    handler = new NotifyOnChatStateUpdatedEventHandler(
      mockNotificationService as INotification,
    );
  });

  describe('handle', () => {
    it('debería notificar a todos los participantes del chat cuando se actualiza el estado', async () => {
      // Arrange
      const chatId = 'chat-123';
      const newStatus = 'closed';

      const event = new StatusUpdatedEvent({
        timestamp: new Date(),
        attributes: {
          chat: {
            id: chatId,
            status: newStatus,
            lastMessage: null,
            lastMessageAt: null,
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
            ],
          },
          oldStatus: 'active',
        },
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockNotificationService.notify).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.notify).toHaveBeenNthCalledWith(1, {
        recipientId: 'participant-1',
        payload: {
          status: newStatus,
          chatId,
        },
        type: 'chat:status-updated',
      });
      expect(mockNotificationService.notify).toHaveBeenNthCalledWith(2, {
        recipientId: 'participant-2',
        payload: {
          status: newStatus,
          chatId,
        },
        type: 'chat:status-updated',
      });
    });

    it('debería manejar correctamente un chat sin participantes', async () => {
      // Arrange
      const chatId = 'chat-123';
      const newStatus = 'closed';

      const event = new StatusUpdatedEvent({
        timestamp: new Date(),
        attributes: {
          chat: {
            id: chatId,
            status: newStatus,
            lastMessage: null,
            lastMessageAt: null,
            createdAt: new Date(),
            participants: [],
          },
          oldStatus: 'active',
        },
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockNotificationService.notify).not.toHaveBeenCalled();
    });
  });
});