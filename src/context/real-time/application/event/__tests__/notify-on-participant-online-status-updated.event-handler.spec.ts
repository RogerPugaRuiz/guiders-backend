import { Test, TestingModule } from '@nestjs/testing';
import { NotifyOnParticipantOnlineStatusUpdatedEventHandler } from '../notify-on-participant-online-status-updated.event-handler';
import { ParticipantOnlineStatusUpdatedEvent } from 'src/context/conversations/chat/domain/chat/events/participant-online-status-updated.event';
import { NOTIFICATION, INotification } from '../../../domain/notification';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { Logger } from '@nestjs/common';

describe('NotifyOnParticipantOnlineStatusUpdatedEventHandler', () => {
  let handler: NotifyOnParticipantOnlineStatusUpdatedEventHandler;
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
        NotifyOnParticipantOnlineStatusUpdatedEventHandler,
        {
          provide: NOTIFICATION,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    handler = module.get<NotifyOnParticipantOnlineStatusUpdatedEventHandler>(
      NotifyOnParticipantOnlineStatusUpdatedEventHandler,
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
    it('debe enviar notificaciones a todos los participantes excepto al que cambió su estado online', async () => {
      // Arrange: Preparar el evento con datos de prueba
      const chatId = Uuid.random().value;
      const participantId = Uuid.random().value;
      const otherParticipantId1 = Uuid.random().value;
      const otherParticipantId2 = Uuid.random().value;
      const createdAt = new Date();

      const updatedParticipant = {
        id: participantId,
        previousOnlineStatus: false,
      };

      const chat = {
        id: chatId,
        participants: [
          {
            id: participantId,
            name: 'Participant 1',
            isCommercial: false,
            isVisitor: true,
            isOnline: true, // Cambió de false a true
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
      };

      const event = new ParticipantOnlineStatusUpdatedEvent({
        updatedParticipant,
        chat,
      });

      // Act: Ejecutar el handler
      await handler.handle(event);

      // Assert: Verificar que se llamó al servicio de notificaciones para cada participante excepto el que cambió su estado
      expect(mockNotificationService.notify).toHaveBeenCalledTimes(2);
      
      // Verificar la primera notificación
      expect(mockNotificationService.notify).toHaveBeenNthCalledWith(
        1,
        {
          recipientId: otherParticipantId1,
          payload: {
            isOnline: true, // Estado nuevo
            participantId: participantId,
          },
          type: 'participant:online-status-updated',
        },
      );
      
      // Verificar la segunda notificación
      expect(mockNotificationService.notify).toHaveBeenNthCalledWith(
        2,
        {
          recipientId: otherParticipantId2,
          payload: {
            isOnline: true, // Estado nuevo
            participantId: participantId,
          },
          type: 'participant:online-status-updated',
        },
      );
      
      // Verificar que se loggeó correctamente
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Notificando a ${participantId} que su estado online ha cambiado de false a true`),
      );
    });

    it('no debe enviar notificaciones si el participante no se encuentra en el chat', async () => {
      // Arrange: Preparar el evento con un participante que no está en el chat
      const chatId = Uuid.random().value;
      const participantId = Uuid.random().value;
      const otherParticipantId1 = Uuid.random().value;
      const createdAt = new Date();

      const updatedParticipant = {
        id: 'non-existent-participant-id',
        previousOnlineStatus: false,
      };

      const chat = {
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
        ],
        status: 'active',
        lastMessage: null,
        lastMessageAt: null,
        createdAt: createdAt,
      };

      const event = new ParticipantOnlineStatusUpdatedEvent({
        updatedParticipant,
        chat,
      });

      // Act: Ejecutar el handler
      await handler.handle(event);

      // Assert: Verificar que no se llamó al servicio de notificaciones y se registró una advertencia
      expect(mockNotificationService.notify).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Participant with ID: ${updatedParticipant.id} not found in chat with ID: ${chatId}`),
      );
    });

    it('no debe enviar notificaciones si no hay más participantes en el chat', async () => {
      // Arrange: Preparar el evento con solo un participante
      const chatId = Uuid.random().value;
      const participantId = Uuid.random().value;
      const createdAt = new Date();

      const updatedParticipant = {
        id: participantId,
        previousOnlineStatus: false,
      };

      const chat = {
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
      };

      const event = new ParticipantOnlineStatusUpdatedEvent({
        updatedParticipant,
        chat,
      });

      // Act: Ejecutar el handler
      await handler.handle(event);

      // Assert: Verificar que no se llamó al servicio de notificaciones (no hay otros participantes para notificar)
      expect(mockNotificationService.notify).not.toHaveBeenCalled();
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Notificando a ${participantId} que su estado online ha cambiado de false a true`),
      );
    });
  });
});