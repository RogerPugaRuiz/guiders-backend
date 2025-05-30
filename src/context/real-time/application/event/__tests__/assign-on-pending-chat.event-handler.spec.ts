import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { AssignOnPendingChatEventHandler } from '../assign-on-pending-chat.event-handler';
import { NewChatCreatedEvent } from 'src/context/conversations/chat/domain/chat/events/new-chat-created.event';
import { CommercialAssignmentService } from '../../../domain/commercial-assignment.service';
import { ConnectionUser } from '../../../domain/connection-user';
import { ConnectionUserId } from '../../../domain/value-objects/connection-user-id';
import { ConnectionRole } from '../../../domain/value-objects/connection-role';
import { ConnectionSocketId } from '../../../domain/value-objects/connection-socket-id';
import { ChatCommercialsAssignedEvent } from '../../../domain/events/chat-commercials-assigned.event';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('AssignOnPendingChatEventHandler', () => {
  let handler: AssignOnPendingChatEventHandler;
  let mockCommercialAssignmentService: {
    getConnectedCommercials: jest.Mock;
  };
  let mockEventBus: {
    publish: jest.Mock;
  };
  let loggerWarnSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockCommercialAssignmentService = {
      getConnectedCommercials: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn(),
    };

    // Mock de los métodos del logger
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignOnPendingChatEventHandler,
        {
          provide: CommercialAssignmentService,
          useValue: mockCommercialAssignmentService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<AssignOnPendingChatEventHandler>(
      AssignOnPendingChatEventHandler,
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
    it('debe asignar comerciales conectados al nuevo chat', async () => {
      // Arrange: Preparar el evento con datos de prueba
      const chatId = Uuid.random().value;
      const visitorId = Uuid.random().value;
      const createdAt = new Date();
      
      const event = new NewChatCreatedEvent({
        chat: {
          id: chatId,
          participants: [
            {
              id: visitorId,
              name: 'Visitante',
              isCommercial: false,
              isVisitor: true,
              isOnline: true,
              assignedAt: createdAt,
              lastSeenAt: null,
              isViewing: false,
              isTyping: false,
            },
          ],
          status: 'pending',
          lastMessage: null,
          lastMessageAt: null,
          createdAt: createdAt,
        },
        publisherId: visitorId,
      });

      // Crear dos comerciales conectados
      const commercial1 = createConnectedCommercial('commercial-1');
      const commercial2 = createConnectedCommercial('commercial-2');

      // Configurar el mock para devolver los comerciales conectados
      mockCommercialAssignmentService.getConnectedCommercials.mockResolvedValue([
        commercial1,
        commercial2,
      ]);

      // Act: Ejecutar el handler
      await handler.handle(event);

      // Assert: Verificar que se publicó el evento correcto
      expect(mockCommercialAssignmentService.getConnectedCommercials).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(ChatCommercialsAssignedEvent),
      );
      
      // Verificar los detalles del evento publicado
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(ChatCommercialsAssignedEvent);
      expect(publishedEvent.chatId).toBe(chatId);
      expect(publishedEvent.commercialIds).toEqual(['commercial-1', 'commercial-2']);
      
      // Verificar el log
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Chat ${chatId} asignado a 2 comerciales`,
      );
    });

    it('no debe asignar comerciales cuando no hay comerciales conectados', async () => {
      // Arrange: Preparar el evento con datos de prueba
      const chatId = Uuid.random().value;
      const visitorId = Uuid.random().value;
      const createdAt = new Date();
      
      const event = new NewChatCreatedEvent({
        chat: {
          id: chatId,
          participants: [
            {
              id: visitorId,
              name: 'Visitante',
              isCommercial: false,
              isVisitor: true,
              isOnline: true,
              assignedAt: createdAt,
              lastSeenAt: null,
              isViewing: false,
              isTyping: false,
            },
          ],
          status: 'pending',
          lastMessage: null,
          lastMessageAt: null,
          createdAt: createdAt,
        },
        publisherId: visitorId,
      });

      // Configurar el mock para devolver una lista vacía
      mockCommercialAssignmentService.getConnectedCommercials.mockResolvedValue([]);

      // Act: Ejecutar el handler
      await handler.handle(event);

      // Assert: Verificar que se registró una advertencia y no se publicó ningún evento
      expect(mockCommercialAssignmentService.getConnectedCommercials).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'No hay comerciales conectados para asignar al chat',
      );
    });
  });
});

// Función auxiliar para crear comerciales conectados
function createConnectedCommercial(userId: string): ConnectionUser {
  const connectionUser = ConnectionUser.create({
    userId: new ConnectionUserId(userId),
    roles: [new ConnectionRole('commercial')],
  });
  return connectionUser.connect(new ConnectionSocketId(`socket-${userId}`));
}