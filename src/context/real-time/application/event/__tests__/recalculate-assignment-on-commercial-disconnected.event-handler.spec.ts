import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { RecalculateAssignmentOnCommercialDisconnectedEventHandler } from '../recalculate-assignment-on-commercial-disconnected.event-handler';
import { CommercialDisconnectedEvent } from '../../../domain/events/commercial-disconnected.event';
import { ConnectionRole } from '../../../domain/value-objects/connection-role';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from 'src/context/conversations/chat/domain/chat/chat.repository';
import { CommercialAssignmentService } from '../../../domain/commercial-assignment.service';
import { Chat } from 'src/context/conversations/chat/domain/chat/chat';

describe('RecalculateAssignmentOnCommercialDisconnectedEventHandler', () => {
  let handler: RecalculateAssignmentOnCommercialDisconnectedEventHandler;
  let mockChatRepository: Partial<IChatRepository>;
  let mockEventBus: Partial<EventBus>;
  let mockCommercialAssignmentService: Partial<CommercialAssignmentService>;

  beforeEach(async () => {
    // Create mocks
    mockChatRepository = {
      find: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn(),
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
          provide: CHAT_REPOSITORY,
          useValue: mockChatRepository,
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
