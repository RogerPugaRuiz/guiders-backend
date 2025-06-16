// Prueba unitaria para NotifyOnParticipantAssignedToChatEventHandler
// Ubicación: src/context/real-time/application/event/__tests__/notify-on-participant-assigned-to-chat.event-handler.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotifyOnParticipantAssignedToChatEventHandler } from '../notify-on-participant-assigned-to-chat.event-handler';
import { ParticipantAssignedEvent } from 'src/context/conversations/chat/domain/chat/events/participant-assigned.event';
import { INotification, NOTIFICATION } from '../../../domain/notification';
import {
  ChatPrimitives,
  ParticipantPrimitives,
} from 'src/context/conversations/chat/domain/chat/chat';

describe('NotifyOnParticipantAssignedToChatEventHandler', () => {
  let handler: NotifyOnParticipantAssignedToChatEventHandler;
  let mockNotification: jest.Mocked<INotification>;

  beforeEach(async () => {
    // Crear mock del servicio de notificación
    mockNotification = {
      notify: jest.fn().mockResolvedValue(undefined),
      notifyRole: jest.fn().mockResolvedValue(undefined),
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  it('debe notificar al participante asignado cuando se ejecuta el evento', async () => {
    // Arrange
    const chatPrimitives: ChatPrimitives = {
      id: 'chat-123',
      status: 'pending',
      participants: [],
      lastMessage: null,
      lastMessageAt: null,
      createdAt: new Date(),
    };

    const participantPrimitives: ParticipantPrimitives = {
      id: 'participant-123',
      name: 'Test Commercial',
      isCommercial: true,
      isVisitor: false,
      isOnline: true,
      assignedAt: new Date(),
      lastSeenAt: new Date(),
      isViewing: false,
      isTyping: false,
      isAnonymous: false,
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
    // Como no hay otros participantes en el chat, solo se realiza una notificación
    expect(mockNotification.notify).toHaveBeenCalledTimes(1);
  });

  it('debe manejar error en notificación gracefully', async () => {
    // Arrange
    const existingParticipant: ParticipantPrimitives = {
      id: 'existing-participant',
      name: 'Existing User',
      isCommercial: true,
      isVisitor: false,
      isOnline: true,
      assignedAt: new Date(),
      lastSeenAt: new Date(),
      isViewing: false,
      isTyping: false,
      isAnonymous: false,
    };

    const chatPrimitives: ChatPrimitives = {
      id: 'chat-123',
      status: 'pending',
      participants: [existingParticipant],
      lastMessage: null,
      lastMessageAt: null,
      createdAt: new Date(),
    };

    const participantPrimitives: ParticipantPrimitives = {
      id: 'participant-123',
      name: 'Test Commercial',
      isCommercial: true,
      isVisitor: false,
      isOnline: true,
      assignedAt: new Date(),
      lastSeenAt: new Date(),
      isViewing: false,
      isTyping: false,
      isAnonymous: false,
    };

    const event = new ParticipantAssignedEvent({
      chat: chatPrimitives,
      newParticipant: participantPrimitives,
    });

    // Mock para error en notificación
    mockNotification.notify.mockRejectedValue(new Error('Notification error'));

    // Act & Assert - no debe lanzar error
    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('debe notificar con el tipo correcto para participante visitante y a los participantes existentes', async () => {
    // Arrange
    const existingParticipant: ParticipantPrimitives = {
      id: 'existing-commercial',
      name: 'Existing Commercial',
      isCommercial: true,
      isVisitor: false,
      isOnline: true,
      assignedAt: new Date(),
      lastSeenAt: new Date(),
      isViewing: false,
      isTyping: false,
      isAnonymous: false,
    };

    const chatPrimitives: ChatPrimitives = {
      id: 'chat-456',
      status: 'active',
      participants: [existingParticipant],
      lastMessage: null,
      lastMessageAt: null,
      createdAt: new Date(),
    };

    const visitorParticipant: ParticipantPrimitives = {
      id: 'participant-456',
      name: 'Test Visitor',
      isCommercial: false,
      isVisitor: true,
      isOnline: false,
      assignedAt: new Date(),
      lastSeenAt: new Date(),
      isViewing: false,
      isTyping: false,
      isAnonymous: false,
    };

    const event = new ParticipantAssignedEvent({
      chat: chatPrimitives,
      newParticipant: visitorParticipant,
    });

    // Act
    await handler.handle(event);

    // Assert
    // Verificar notificación al participante visitante
    expect(mockNotification.notify).toHaveBeenCalledWith({
      payload: { chat: chatPrimitives },
      recipientId: 'participant-456',
      type: 'commercial:incoming-chats',
    });

    // Verificar notificación al participante comercial existente
    expect(mockNotification.notify).toHaveBeenCalledWith({
      payload: {
        chatId: 'chat-456',
        newParticipant: visitorParticipant,
      },
      recipientId: 'existing-commercial',
      type: 'chat:participant-joined',
    });

    // Verificar que se realizaron dos notificaciones
    expect(mockNotification.notify).toHaveBeenCalledTimes(2);
  });

  it('debe notificar a todos los participantes existentes cuando un nuevo participante se une al chat', async () => {
    // Arrange
    const existingParticipant1: ParticipantPrimitives = {
      id: 'existing-participant-1',
      name: 'Existing Commercial',
      isCommercial: true,
      isVisitor: false,
      isOnline: true,
      assignedAt: new Date(),
      lastSeenAt: new Date(),
      isViewing: false,
      isTyping: false,
      isAnonymous: false,
    };

    const existingParticipant2: ParticipantPrimitives = {
      id: 'existing-participant-2',
      name: 'Existing Visitor',
      isCommercial: false,
      isVisitor: true,
      isOnline: true,
      assignedAt: new Date(),
      lastSeenAt: new Date(),
      isViewing: false,
      isTyping: false,
      isAnonymous: false,
    };

    const chatPrimitives: ChatPrimitives = {
      id: 'chat-789',
      status: 'active',
      participants: [existingParticipant1, existingParticipant2],
      lastMessage: 'Hola',
      lastMessageAt: new Date(),
      createdAt: new Date(),
    };

    const newParticipant: ParticipantPrimitives = {
      id: 'new-participant-789',
      name: 'New Participant',
      isCommercial: true,
      isVisitor: false,
      isOnline: true,
      assignedAt: new Date(),
      lastSeenAt: new Date(),
      isViewing: false,
      isTyping: false,
      isAnonymous: false,
    };

    const event = new ParticipantAssignedEvent({
      chat: chatPrimitives,
      newParticipant,
    });

    // Act
    await handler.handle(event);

    // Assert
    // Verificar la notificación al nuevo participante
    expect(mockNotification.notify).toHaveBeenCalledWith({
      payload: { chat: chatPrimitives },
      recipientId: 'new-participant-789',
      type: 'commercial:incoming-chats',
    });

    // Verificar notificación al primer participante existente
    expect(mockNotification.notify).toHaveBeenCalledWith({
      payload: {
        chatId: 'chat-789',
        newParticipant: newParticipant,
      },
      recipientId: 'existing-participant-1',
      type: 'chat:participant-joined',
    });

    // Verificar notificación al segundo participante existente
    expect(mockNotification.notify).toHaveBeenCalledWith({
      payload: {
        chatId: 'chat-789',
        newParticipant: newParticipant,
      },
      recipientId: 'existing-participant-2',
      type: 'chat:participant-joined',
    });

    // Se deben haber realizado 3 notificaciones: una al nuevo participante y una a cada participante existente
    expect(mockNotification.notify).toHaveBeenCalledTimes(3);
  });
});
