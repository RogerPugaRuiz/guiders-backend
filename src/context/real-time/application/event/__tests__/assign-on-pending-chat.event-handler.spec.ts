import { AssignOnPendingChatEventHandler } from '../assign-on-pending-chat.event-handler';
import { EventBus } from '@nestjs/cqrs';
import { CommercialAssignmentService } from '../../../domain/commercial-assignment.service';
import { NewChatCreatedEvent } from 'src/context/conversations/chat/domain/chat/events/new-chat-created.event';
import { ConnectionUser } from '../../../domain/connection-user';
import { ConnectionUserId } from '../../../domain/value-objects/connection-user-id';
import { ConnectionRole } from '../../../domain/value-objects/connection-role';
import { ChatCommercialsAssignedEvent } from '../../../domain/events/chat-commercials-assigned.event';

describe('AssignOnPendingChatEventHandler', () => {
  let handler: AssignOnPendingChatEventHandler;
  let mockCommercialAssignmentService: Partial<CommercialAssignmentService>;
  let mockEventBus: Partial<EventBus>;
  let mockLogger: any;

  beforeEach(() => {
    // Crear mocks
    mockCommercialAssignmentService = {
      getConnectedCommercials: jest.fn().mockResolvedValue([]),
    };

    mockEventBus = {
      publish: jest.fn(),
    };

    // Crear handler directamente
    handler = new AssignOnPendingChatEventHandler(
      mockCommercialAssignmentService as CommercialAssignmentService,
      mockEventBus as EventBus,
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
    it('debería asignar comerciales conectados a un nuevo chat', async () => {
      // Arrange
      const chatId = 'chat-123';
      
      // Crear un evento NewChatCreatedEvent
      const event = new NewChatCreatedEvent({
        chat: {
          id: chatId,
          status: 'active',
          lastMessage: null,
          lastMessageAt: null,
          createdAt: new Date(),
          participants: [
            {
              id: 'visitor-1',
              isOnline: true,
              name: 'Visitor 1',
              isCommercial: false,
              isVisitor: true,
              assignedAt: new Date(),
              lastSeenAt: new Date(),
              isViewing: false,
              isTyping: false,
            },
          ],
        },
        publisherId: 'system',
      });

      // Mockear comerciales conectados
      const commercial1 = ConnectionUser.create({
        userId: ConnectionUserId.create('commercial-1'),
        roles: [ConnectionRole.create('commercial')],
      });

      const commercial2 = ConnectionUser.create({
        userId: ConnectionUserId.create('commercial-2'),
        roles: [ConnectionRole.create('commercial')],
      });

      // Configurar el mock para devolver comerciales conectados
      (mockCommercialAssignmentService.getConnectedCommercials as jest.Mock).mockResolvedValue([
        commercial1, commercial2
      ]);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommercialAssignmentService.getConnectedCommercials).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(ChatCommercialsAssignedEvent)
      );
      
      // Verificar los comerciales asignados en el evento
      const publishedEvent = (mockEventBus.publish as jest.Mock).mock.calls[0][0];
      expect(publishedEvent.chatId).toBe(chatId);
      expect(publishedEvent.commercialIds).toEqual(['commercial-1', 'commercial-2']);
      
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('2 comerciales')
      );
    });

    it('no debería asignar comerciales si no hay ninguno conectado', async () => {
      // Arrange
      const chatId = 'chat-123';
      
      // Crear un evento NewChatCreatedEvent
      const event = new NewChatCreatedEvent({
        chat: {
          id: chatId,
          status: 'active',
          lastMessage: null,
          lastMessageAt: null,
          createdAt: new Date(),
          participants: [
            {
              id: 'visitor-1',
              isOnline: true,
              name: 'Visitor 1',
              isCommercial: false,
              isVisitor: true,
              assignedAt: new Date(),
              lastSeenAt: new Date(),
              isViewing: false,
              isTyping: false,
            },
          ],
        },
        publisherId: 'system',
      });

      // Configurar el mock para devolver array vacío (no hay comerciales conectados)
      (mockCommercialAssignmentService.getConnectedCommercials as jest.Mock).mockResolvedValue([]);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommercialAssignmentService.getConnectedCommercials).toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No hay comerciales conectados')
      );
    });
  });
});
