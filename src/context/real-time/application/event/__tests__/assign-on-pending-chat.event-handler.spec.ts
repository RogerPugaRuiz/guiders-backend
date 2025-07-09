import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { AssignOnPendingChatEventHandler } from '../assign-on-pending-chat.event-handler';
import { NewChatCreatedEvent } from '../../../../conversations/chat/domain/chat/events/new-chat-created.event';
import { ChatCommercialsAssignedEvent } from '../../../domain/events/chat-commercials-assigned.event';
import { CommercialAssignmentService } from '../../../domain/commercial-assignment.service';
import { ConnectionUser } from '../../../domain/connection-user';
import { ConnectionUserId } from '../../../domain/value-objects/connection-user-id';
import { ConnectionRole } from '../../../domain/value-objects/connection-role';
import { ConnectionCompanyId } from '../../../domain/value-objects/connection-company-id';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';
import { ChatPrimitives } from '../../../../conversations/chat/domain/chat/chat';

describe('AssignOnPendingChatEventHandler', () => {
  let handler: AssignOnPendingChatEventHandler;
  let eventBus: EventBus;
  let commercialAssignmentService: CommercialAssignmentService;

  const chatId = Uuid.random();
  const companyId = Uuid.random();
  const commercialId1 = Uuid.random();
  const commercialId2 = Uuid.random();

  beforeEach(async () => {
    const mockCommercialAssignmentService = {
      getConnectedCommercials: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

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
    eventBus = module.get<EventBus>(EventBus);
    commercialAssignmentService = module.get<CommercialAssignmentService>(
      CommercialAssignmentService,
    );
  });

  describe('handle', () => {
    it('debe publicar ChatCommercialsAssignedEvent cuando hay comerciales conectados', async () => {
      // Arrange
      const connectedCommercials = [
        ConnectionUser.create({
          userId: new ConnectionUserId(commercialId1.value),
          roles: [ConnectionRole.commercial()],
          companyId: new ConnectionCompanyId(companyId.value),
        }),
        ConnectionUser.create({
          userId: new ConnectionUserId(commercialId2.value),
          roles: [ConnectionRole.commercial()],
          companyId: new ConnectionCompanyId(companyId.value),
        }),
      ];

      (
        commercialAssignmentService.getConnectedCommercials as jest.Mock
      ).mockResolvedValue(connectedCommercials);

      const mockChatPrimitives: ChatPrimitives = {
        id: chatId.value,
        companyId: companyId.value,
        participants: [],
        status: 'pending',
        lastMessage: null,
        lastMessageAt: null,
        createdAt: new Date(),
      };

      const event = new NewChatCreatedEvent({
        chat: mockChatPrimitives,
        publisherId: 'test-publisher',
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(
        commercialAssignmentService.getConnectedCommercials,
      ).toHaveBeenCalledWith(companyId.value);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(ChatCommercialsAssignedEvent),
      );

      const publishedEvent = (eventBus.publish as jest.Mock).mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(ChatCommercialsAssignedEvent);
      expect(publishedEvent.chatId).toBe(chatId.value);
      expect(publishedEvent.commercialIds).toHaveLength(2);
      expect(publishedEvent.commercialIds).toContain(commercialId1.value);
      expect(publishedEvent.commercialIds).toContain(commercialId2.value);
    });

    it('debe publicar ChatCommercialsAssignedEvent con lista vacía cuando no hay comerciales conectados', async () => {
      // Arrange
      (
        commercialAssignmentService.getConnectedCommercials as jest.Mock
      ).mockResolvedValue([]);

      const mockChatPrimitives: ChatPrimitives = {
        id: chatId.value,
        companyId: companyId.value,
        participants: [],
        status: 'pending',
        lastMessage: null,
        lastMessageAt: null,
        createdAt: new Date(),
      };

      const event = new NewChatCreatedEvent({
        chat: mockChatPrimitives,
        publisherId: 'test-publisher',
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(
        commercialAssignmentService.getConnectedCommercials,
      ).toHaveBeenCalledWith(companyId.value);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(ChatCommercialsAssignedEvent),
      );

      const publishedEvent = (eventBus.publish as jest.Mock).mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(ChatCommercialsAssignedEvent);
      expect(publishedEvent.chatId).toBe(chatId.value);
      expect(publishedEvent.commercialIds).toHaveLength(0);
    });

    it('debe manejar errores en el servicio de asignación de comerciales', async () => {
      // Arrange
      const error = new Error('Error al buscar comerciales');
      (
        commercialAssignmentService.getConnectedCommercials as jest.Mock
      ).mockRejectedValue(error);

      const mockChatPrimitives: ChatPrimitives = {
        id: chatId.value,
        companyId: companyId.value,
        participants: [],
        status: 'pending',
        lastMessage: null,
        lastMessageAt: null,
        createdAt: new Date(),
      };

      const event = new NewChatCreatedEvent({
        chat: mockChatPrimitives,
        publisherId: 'test-publisher',
      });

      // Act & Assert
      await expect(handler.handle(event)).rejects.toThrow(
        'Error al buscar comerciales',
      );
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
