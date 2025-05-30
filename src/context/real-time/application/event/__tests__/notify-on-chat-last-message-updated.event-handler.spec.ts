import { Test, TestingModule } from '@nestjs/testing';
import { NotifyOnChatLastMessageUpdatedEventHandler } from '../notify-on-chat-last-message-updated.event-handler';
import { ChatUpdatedWithNewMessageEvent } from 'src/context/conversations/chat/domain/chat/events/chat-updated-with-new-message.event';
import { NOTIFICATION, INotification } from '../../../domain/notification';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('NotifyOnChatLastMessageUpdatedEventHandler', () => {
  let handler: NotifyOnChatLastMessageUpdatedEventHandler;
  let mockNotificationService: Partial<INotification>;

  beforeEach(async () => {
    // Mock del servicio de notificaciones
    mockNotificationService = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyOnChatLastMessageUpdatedEventHandler,
        {
          provide: NOTIFICATION,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    handler = module.get<NotifyOnChatLastMessageUpdatedEventHandler>(
      NotifyOnChatLastMessageUpdatedEventHandler,
    );

    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    it('debe enviar notificaciones a todos los participantes del chat cuando se actualiza el último mensaje', async () => {
      // Arrange: Preparar el evento con datos de prueba
      const chatId = Uuid.random().value;
      const senderId = Uuid.random().value;
      const participant1Id = Uuid.random().value;
      const participant2Id = Uuid.random().value;
      const lastMessageContent = 'Este es el último mensaje';
      const lastMessageAt = new Date();

      const event = new ChatUpdatedWithNewMessageEvent({
        chat: {
          id: chatId,
          participants: [
            { id: participant1Id, name: 'Usuario 1' },
            { id: participant2Id, name: 'Usuario 2' },
          ],
          lastMessage: lastMessageContent,
          lastMessageAt: lastMessageAt,
        },
        message: {
          chatId: chatId,
          senderId: senderId,
          content: lastMessageContent,
        },
      });

      // Act: Ejecutar el handler
      await handler.handle(event);

      // Assert: Verificar que se llamó al servicio de notificaciones para cada participante
      expect(mockNotificationService.notify).toHaveBeenCalledTimes(2);
      
      expect(mockNotificationService.notify).toHaveBeenNthCalledWith(
        1,
        {
          recipientId: participant1Id,
          payload: {
            lastMessage: lastMessageContent,
            lastMessageAt: lastMessageAt,
            chatId: chatId,
            senderId: senderId,
          },
          type: 'chat:last-message-updated',
        },
      );
      
      expect(mockNotificationService.notify).toHaveBeenNthCalledWith(
        2,
        {
          recipientId: participant2Id,
          payload: {
            lastMessage: lastMessageContent,
            lastMessageAt: lastMessageAt,
            chatId: chatId,
            senderId: senderId,
          },
          type: 'chat:last-message-updated',
        },
      );
    });

    it('no debe enviar notificaciones si no hay participantes en el chat', async () => {
      // Arrange: Preparar el evento sin participantes
      const chatId = Uuid.random().value;
      const senderId = Uuid.random().value;
      const lastMessageContent = 'Este es el último mensaje';
      const lastMessageAt = new Date();

      const event = new ChatUpdatedWithNewMessageEvent({
        chat: {
          id: chatId,
          participants: [],
          lastMessage: lastMessageContent,
          lastMessageAt: lastMessageAt,
        },
        message: {
          chatId: chatId,
          senderId: senderId,
          content: lastMessageContent,
        },
      });

      // Act: Ejecutar el handler
      await handler.handle(event);

      // Assert: Verificar que no se llamó al servicio de notificaciones
      expect(mockNotificationService.notify).not.toHaveBeenCalled();
    });
  });
});