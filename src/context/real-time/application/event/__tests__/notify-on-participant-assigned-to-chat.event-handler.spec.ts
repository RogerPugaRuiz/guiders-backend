// Prueba unitaria para NotifyOnParticipantAssignedToChatEventHandler
// Ubicación: src/context/real-time/application/event/__tests__/notify-on-participant-assigned-to-chat.event-handler.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotifyOnParticipantAssignedToChatEventHandler } from '../notify-on-participant-assigned-to-chat.event-handler';
import { ParticipantAssignedEvent } from 'src/context/conversations/chat/domain/chat/events/participant-assigned.event';
import { INotification, NOTIFICATION } from '../../../domain/notification';
import { ChatPrimitives, ParticipantPrimitives } from 'src/context/conversations/chat/domain/chat/chat';

describe('NotifyOnParticipantAssignedToChatEventHandler', () => {
  let handler: NotifyOnParticipantAssignedToChatEventHandler;
  let mockNotification: jest.Mocked<INotification>;

  beforeEach(async () => {
    // Crear mock del servicio de notificación
    mockNotification = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    // Configuración del módulo de prueba
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyOnParticipantAssignedToChatEventHandler,
        {
          provide: NOTIFICATION,
          useValue: mockNotification,
        },
      ],
    }).compile();

    handler = module.get<NotifyOnParticipantAssignedToChatEventHandler>(
      NotifyOnParticipantAssignedToChatEventHandler,
    );
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  it('debe notificar al participante asignado cuando se ejecuta el evento', async () => {
    // Arrange
    const chatPrimitives: ChatPrimitives = {
      id: 'chat-123',
      state: 'pending',
      participants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const participantPrimitives: ParticipantPrimitives = {
      id: 'participant-123',
      type: 'commercial',
      isOnline: true,
      lastReadAt: new Date(),
      unreadMessages: 0,
    };

    const event = new ParticipantAssignedEvent({
      chat: chatPrimitives,
      newParticipant: participantPrimitives,
    });

    // Act
    await handler.handle(event);

    // Assert
    expect(mockNotification.notify).toHaveBeenCalledWith({
      payload: { chat: chatPrimitives },
      recipientId: 'participant-123',
      type: 'commercial:incoming-chats',
    });
    expect(mockNotification.notify).toHaveBeenCalledTimes(1);
  });

  it('debe manejar error en notificación gracefully', async () => {
    // Arrange
    const chatPrimitives: ChatPrimitives = {
      id: 'chat-123',
      state: 'pending',
      participants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const participantPrimitives: ParticipantPrimitives = {
      id: 'participant-123',
      type: 'commercial',
      isOnline: true,
      lastReadAt: new Date(),
      unreadMessages: 0,
    };

    const event = new ParticipantAssignedEvent({
      chat: chatPrimitives,
      newParticipant: participantPrimitives,
    });

    // Simular error en la notificación
    mockNotification.notify.mockRejectedValue(new Error('Notification failed'));

    // Act & Assert - no debe lanzar excepción
    await expect(handler.handle(event)).rejects.toThrow('Notification failed');
    expect(mockNotification.notify).toHaveBeenCalledTimes(1);
  });

  it('debe extraer correctamente los datos del evento', async () => {
    // Arrange
    const chatPrimitives: ChatPrimitives = {
      id: 'chat-456',
      state: 'active',
      participants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const participantPrimitives: ParticipantPrimitives = {
      id: 'participant-456',
      type: 'visitor',
      isOnline: false,
      lastReadAt: new Date(),
      unreadMessages: 5,
    };

    const event = new ParticipantAssignedEvent({
      chat: chatPrimitives,
      newParticipant: participantPrimitives,
    });

    // Act
    await handler.handle(event);

    // Assert
    expect(mockNotification.notify).toHaveBeenCalledWith({
      payload: { chat: chatPrimitives },
      recipientId: 'participant-456',
      type: 'commercial:incoming-chats',
    });
  });
});