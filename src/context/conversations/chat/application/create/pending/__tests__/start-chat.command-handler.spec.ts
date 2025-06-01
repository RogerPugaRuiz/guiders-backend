import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { StartChatCommandHandler } from '../start-chat.command-handler';
import { StartChatCommand } from '../start-chat.command';
import {
  IChatRepository,
  CHAT_REPOSITORY,
} from '../../../../domain/chat/chat.repository';
import { Chat } from '../../../../domain/chat/chat';

// Mock the Chat static method
jest.mock('../../../../domain/chat/chat', () => ({
  Chat: {
    createPendingChat: jest.fn(),
  },
}));

describe('StartChatCommandHandler', () => {
  let handler: StartChatCommandHandler;
  let chatRepository: jest.Mocked<IChatRepository>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  const mockChatId = 'chat-123';
  const mockVisitorId = 'visitor-123';
  const mockVisitorName = 'John Doe';
  const mockTimestamp = new Date('2024-01-01T10:00:00Z');

  let mockChat: any;
  let mockChatAggregate: any;

  beforeEach(async () => {
    mockChat = {
      id: mockChatId,
    };

    mockChatAggregate = {
      commit: jest.fn(),
    };

    const mockChatRepository = {
      save: jest.fn(),
    };

    const mockEventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue(mockChatAggregate),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartChatCommandHandler,
        {
          provide: CHAT_REPOSITORY,
          useValue: mockChatRepository,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    handler = module.get<StartChatCommandHandler>(StartChatCommandHandler);
    chatRepository = module.get(CHAT_REPOSITORY);
    eventPublisher = module.get(EventPublisher);

    // Reset the mock
    (Chat.createPendingChat as jest.Mock).mockReturnValue(mockChat);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create and save a pending chat successfully', async () => {
      // Arrange
      const command = new StartChatCommand(
        mockChatId,
        mockVisitorId,
        mockVisitorName,
        mockTimestamp,
      );
      chatRepository.save.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(Chat.createPendingChat).toHaveBeenCalledWith({
        chatId: mockChatId,
        visitor: {
          id: mockVisitorId,
          name: mockVisitorName,
        },
        createdAt: mockTimestamp,
      });
      expect(eventPublisher.mergeObjectContext).toHaveBeenCalledWith(mockChat);
      expect(chatRepository.save).toHaveBeenCalledWith(mockChatAggregate);
      expect(mockChatAggregate.commit).toHaveBeenCalled();
    });

    it('should use default timestamp when not provided', async () => {
      // Arrange
      const command = new StartChatCommand(
        mockChatId,
        mockVisitorId,
        mockVisitorName,
      );
      chatRepository.save.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(Chat.createPendingChat).toHaveBeenCalledWith({
        chatId: mockChatId,
        visitor: {
          id: mockVisitorId,
          name: mockVisitorName,
        },
        createdAt: expect.any(Date),
      });
    });

    it('should handle repository save errors', async () => {
      // Arrange
      const command = new StartChatCommand(
        mockChatId,
        mockVisitorId,
        mockVisitorName,
        mockTimestamp,
      );
      chatRepository.save.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database error');
      expect(Chat.createPendingChat).toHaveBeenCalled();
      expect(eventPublisher.mergeObjectContext).toHaveBeenCalledWith(mockChat);
      expect(chatRepository.save).toHaveBeenCalledWith(mockChatAggregate);
      expect(mockChatAggregate.commit).not.toHaveBeenCalled();
    });

    it('should pass correct visitor information to createPendingChat', async () => {
      // Arrange
      const customVisitorId = 'visitor-456';
      const customVisitorName = 'Jane Smith';
      const command = new StartChatCommand(
        mockChatId,
        customVisitorId,
        customVisitorName,
        mockTimestamp,
      );
      chatRepository.save.mockResolvedValue(undefined);

      // Act
      await handler.execute(command);

      // Assert
      expect(Chat.createPendingChat).toHaveBeenCalledWith({
        chatId: mockChatId,
        visitor: {
          id: customVisitorId,
          name: customVisitorName,
        },
        createdAt: mockTimestamp,
      });
    });

    it('should handle Chat.createPendingChat errors', async () => {
      // Arrange
      const command = new StartChatCommand(
        mockChatId,
        mockVisitorId,
        mockVisitorName,
        mockTimestamp,
      );
      (Chat.createPendingChat as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid chat data');
      });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Invalid chat data',
      );
      expect(Chat.createPendingChat).toHaveBeenCalled();
      expect(eventPublisher.mergeObjectContext).not.toHaveBeenCalled();
      expect(chatRepository.save).not.toHaveBeenCalled();
    });
  });
});
