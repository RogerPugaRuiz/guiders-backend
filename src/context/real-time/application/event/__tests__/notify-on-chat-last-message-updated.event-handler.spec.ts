import { NotifyOnChatLastMessageUpdatedEventHandler } from '../notify-on-chat-last-message-updated.event-handler';
import { ChatUpdatedWithNewMessageEvent } from 'src/context/conversations/chat/domain/chat/events/chat-updated-with-new-message.event';
import { NOTIFICATION, INotification } from '../../../domain/notification';

describe('NotifyOnChatLastMessageUpdatedEventHandler', () => {
  let handler: NotifyOnChatLastMessageUpdatedEventHandler;
  let mockNotificationService: Partial<INotification>;

  beforeEach(() => {
    // Crear mocks
    mockNotificationService = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    // Crear handler directamente
    handler = new NotifyOnChatLastMessageUpdatedEventHandler(
      mockNotificationService as INotification,
    );
  });

  describe('handle', () => {
    it('debería notificar a todos los participantes del chat cuando se actualiza el último mensaje', async () => {
      // Arrange
      const chatId = 'chat-123';
      const senderId = 'user-1';
      const lastMessage = 'Hello, world!';
      const lastMessageAt = new Date();

      const event = new ChatUpdatedWithNewMessageEvent({
        chat: {
          id: chatId,
          status: 'active',
          lastMessage,
          lastMessageAt,
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
        message: {
          id: 'message-1',
          chatId,
          senderId,
          content: lastMessage,
          createdAt: lastMessageAt,
        },
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockNotificationService.notify).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.notify).toHaveBeenNthCalledWith(1, {
        recipientId: 'participant-1',
        payload: {
          lastMessage,
          lastMessageAt,
          chatId,
          senderId,
        },
        type: 'chat:last-message-updated',
      });
      expect(mockNotificationService.notify).toHaveBeenNthCalledWith(2, {
        recipientId: 'participant-2',
        payload: {
          lastMessage,
          lastMessageAt,
          chatId,
          senderId,
        },
        type: 'chat:last-message-updated',
      });
    });
  });
});