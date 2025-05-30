import { Test, TestingModule } from '@nestjs/testing';
import { NotifyOnChatStateUpdatedEventHandler } from '../notify-on-chat-state-updated.event-handler';
import { StatusUpdatedEvent } from 'src/context/conversations/chat/domain/chat/events/status-updated.event';
import { NOTIFICATION, INotification } from '../../../domain/notification';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('NotifyOnChatStateUpdatedEventHandler', () => {
  let handler: NotifyOnChatStateUpdatedEventHandler;
  let mockNotificationService: Partial<INotification>;

  beforeEach(async () => {
    // Mock del servicio de notificaciones
    mockNotificationService = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyOnChatStateUpdatedEventHandler,
        {
          provide: NOTIFICATION,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    handler = module.get<NotifyOnChatStateUpdatedEventHandler>(
      NotifyOnChatStateUpdatedEventHandler,
    );

    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    it('debe enviar notificaciones a todos los participantes del chat cuando se actualiza el estado', async () => {
      // Arrange: Preparar el evento con datos de prueba
      const chatId = Uuid.random().value;
      const participant1Id = Uuid.random().value;
      const participant2Id = Uuid.random().value;
      const status = 'closed';

      const event = new StatusUpdatedEvent({
        attributes: {
          chat: {
            id: chatId,
            status: status,
            participants: [
              { id: participant1Id, name: 'Usuario 1' },
              { id: participant2Id, name: 'Usuario 2' },
            ],
          },
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
            status: status,
            chatId: chatId,
          },
          type: 'chat:status-updated',
        },
      );
      
      expect(mockNotificationService.notify).toHaveBeenNthCalledWith(
        2,
        {
          recipientId: participant2Id,
          payload: {
            status: status,
            chatId: chatId,
          },
          type: 'chat:status-updated',
        },
      );
    });

    it('no debe enviar notificaciones si no hay participantes en el chat', async () => {
      // Arrange: Preparar el evento sin participantes
      const chatId = Uuid.random().value;
      const status = 'closed';

      const event = new StatusUpdatedEvent({
        attributes: {
          chat: {
            id: chatId,
            status: status,
            participants: [],
          },
        },
      });

      // Act: Ejecutar el handler
      await handler.handle(event);

      // Assert: Verificar que no se llamó al servicio de notificaciones
      expect(mockNotificationService.notify).not.toHaveBeenCalled();
    });
  });
});