import { Test, TestingModule } from '@nestjs/testing';
import { EventBus, CommandBus } from '@nestjs/cqrs';
import { RecalculateAssignmentOnCommercialDisconnectedEventHandler } from '../recalculate-assignment-on-commercial-disconnected.event-handler';
import { CommercialDisconnectedEvent } from '../../../domain/events/commercial-disconnected.event';
import { ConnectionRole } from '../../../domain/value-objects/connection-role';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from 'src/context/conversations/chat/domain/chat/chat.repository';
import {
  COMERCIAL_CLAIM_REPOSITORY,
  IComercialClaimRepository,
} from 'src/context/conversations/chat/domain/claim/comercial-claim.repository';
import { CommercialAssignmentService } from '../../../domain/commercial-assignment.service';
import { Chat } from 'src/context/conversations/chat/domain/chat/chat';

describe('RecalculateAssignmentOnCommercialDisconnectedEventHandler', () => {
  let handler: RecalculateAssignmentOnCommercialDisconnectedEventHandler;
  let mockChatRepository: Partial<IChatRepository>;
  let mockComercialClaimRepository: Partial<IComercialClaimRepository>;
  let mockEventBus: Partial<EventBus>;
  let mockCommandBus: Partial<CommandBus>;
  let mockCommercialAssignmentService: Partial<CommercialAssignmentService>;

  beforeEach(async () => {
    // Create mocks
    mockChatRepository = {
      find: jest.fn(),
    };

    mockComercialClaimRepository = {
      match: jest.fn(),
      findActiveClaimsByComercial: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn(),
    };

    mockCommandBus = {
      execute: jest.fn(),
    };

    mockCommercialAssignmentService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecalculateAssignmentOnCommercialDisconnectedEventHandler,
        {
          provide: CommercialAssignmentService,
          useValue: mockCommercialAssignmentService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
        {
          provide: CHAT_REPOSITORY,
          useValue: mockChatRepository,
        },
        {
          provide: COMERCIAL_CLAIM_REPOSITORY,
          useValue: mockComercialClaimRepository,
        },
      ],
    }).compile();

    handler =
      module.get<RecalculateAssignmentOnCommercialDisconnectedEventHandler>(
        RecalculateAssignmentOnCommercialDisconnectedEventHandler,
      );
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    it('debe ignorar usuarios que no son comerciales', async () => {
      // Arrange
      const userId = 'visitor-id';
      const event = new CommercialDisconnectedEvent({
        userId,
        roles: [ConnectionRole.VISITOR],
        socketId: 'socket-123',
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockChatRepository.find).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('debe ignorar comerciales que no están asignados a chats', async () => {
      // Arrange
      const userId = 'commercial-id';
      const event = new CommercialDisconnectedEvent({
        userId,
        roles: [ConnectionRole.COMMERCIAL],
        socketId: 'socket-123',
      });

      (mockChatRepository.find as jest.Mock).mockResolvedValue({
        chats: [],
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockChatRepository.find).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('debe usar criterio con filtros de participants y status pending', async () => {
      // Arrange
      const userId = 'commercial-id';
      const event = new CommercialDisconnectedEvent({
        userId,
        roles: [ConnectionRole.COMMERCIAL],
        socketId: 'socket-123',
      });

      (mockChatRepository.find as jest.Mock).mockResolvedValue({
        chats: [],
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockChatRepository.find).toHaveBeenCalledTimes(1);
      const criteriaUsed = (mockChatRepository.find as jest.Mock).mock
        .calls[0][0];

      // Verificamos que el criterio tenga los filtros correctos
      expect(criteriaUsed.filters).toHaveLength(2);
      expect(criteriaUsed.filters[0].field).toBe('participants');
      expect(criteriaUsed.filters[0].operator).toBe('=');
      expect(criteriaUsed.filters[0].value).toBe(userId);
      expect(criteriaUsed.filters[1].field).toBe('status');
      expect(criteriaUsed.filters[1].operator).toBe('=');
      expect(criteriaUsed.filters[1].value).toBe('pending');
    });

    it('debe publicar eventos para cada chat donde está asignado el comercial', async () => {
      // Arrange
      const userId = 'commercial-id';
      const event = new CommercialDisconnectedEvent({
        userId,
        roles: [ConnectionRole.COMMERCIAL],
        socketId: 'socket-123',
      });

      const chats = [
        {
          id: { value: 'chat-1' },
          hasParticipant: jest.fn().mockReturnValue(true),
        },
        {
          id: { value: 'chat-2' },
          hasParticipant: jest.fn().mockReturnValue(true),
        },
      ] as unknown as Chat[];

      (mockChatRepository.find as jest.Mock).mockResolvedValue({
        chats,
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockChatRepository.find).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);

      // Verificamos que se publicaron los eventos correctos
      expect(mockEventBus.publish).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          chatId: 'chat-1',
          commercialIds: [userId],
        }),
      );

      expect(mockEventBus.publish).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          chatId: 'chat-2',
          commercialIds: [userId],
        }),
      );
    });

    it('debe filtrar los chats donde no está asignado', async () => {
      // Arrange
      const userId = 'commercial-id';
      const event = new CommercialDisconnectedEvent({
        userId,
        roles: [ConnectionRole.COMMERCIAL],
        socketId: 'socket-123',
      });

      const chats = [
        {
          id: { value: 'chat-1' },
          hasParticipant: jest.fn().mockReturnValue(true),
        },
        {
          id: { value: 'chat-2' },
          hasParticipant: jest.fn().mockReturnValue(false),
        },
      ] as unknown as Chat[];

      (mockChatRepository.find as jest.Mock).mockResolvedValue({
        chats,
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockChatRepository.find).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          chatId: 'chat-1',
          commercialIds: [userId],
        }),
      );
    });
  });
});
