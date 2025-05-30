import { NotifyOnParticipantSeenChatEventHandler } from '../notify-on-participant-seen-chat.event-handler';
import { ParticipantSeenAtEvent } from 'src/context/conversations/chat/domain/chat/events/participant-seen-at.event';
import { NOTIFICATION, INotification } from '../../../domain/notification';

describe('NotifyOnParticipantSeenChatEventHandler', () => {
  let handler: NotifyOnParticipantSeenChatEventHandler;
  let mockNotificationService: Partial<INotification>;
  let mockLogger: any;

  beforeEach(() => {
    // Crear mocks
    mockNotificationService = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    // Crear handler directamente
    handler = new NotifyOnParticipantSeenChatEventHandler(
      mockNotificationService as INotification,
    );

    // Reemplazar el logger interno
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (handler as any).logger = mockLogger;
  });

  describe('handle', () => {
    it('debería notificar a otros participantes cuando alguien ve un chat', async () => {
      // Arrange
      const chatId = 'chat-123';
      const participantId = 'participant-1';
      const previousSeen = new Date(Date.now() - 3600000); // 1 hora antes
      const timestamp = Date.now();

      const eventAttributes = {
        participantUpdate: {
          id: participantId,
          previousSeen,
          previousIsViewing: false,
        },
        chat: {
          id: chatId,
          status: 'active',
          lastMessage: 'Hello',
          lastMessageAt: new Date(),
          createdAt: new Date(),
          participants: [
            {
              id: participantId,
              isOnline: true,
              name: 'Participant 1',
              isCommercial: false,
              isVisitor: true,
              assignedAt: new Date(),
              lastSeenAt: new Date(),
              isViewing: true,
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
      };

      const event = new ParticipantSeenAtEvent({
        attributes: eventAttributes,
        timestamp,
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockNotificationService.notify).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.notify).toHaveBeenCalledWith({
        type: 'participant:seen-chat',
        payload: eventAttributes,
        recipientId: 'participant-2',
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(`to recipient ID: participant-2`),
      );
    });

    it('no debería notificar si no hay otros participantes', async () => {
      // Arrange
      const chatId = 'chat-123';
      const participantId = 'participant-1';
      const previousSeen = new Date(Date.now() - 3600000); // 1 hora antes
      const timestamp = Date.now();

      const eventAttributes = {
        participantUpdate: {
          id: participantId,
          previousSeen,
          previousIsViewing: false,
        },
        chat: {
          id: chatId,
          status: 'active',
          lastMessage: 'Hello',
          lastMessageAt: new Date(),
          createdAt: new Date(),
          participants: [
            {
              id: participantId,
              isOnline: true,
              name: 'Participant 1',
              isCommercial: false,
              isVisitor: true,
              assignedAt: new Date(),
              lastSeenAt: new Date(),
              isViewing: true,
              isTyping: false,
            },
          ],
        },
      };

      const event = new ParticipantSeenAtEvent({
        attributes: eventAttributes,
        timestamp,
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockNotificationService.notify).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`No recipients found`),
      );
    });
  });
});