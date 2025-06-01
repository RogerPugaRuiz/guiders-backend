import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { SaveMessageCommandHandler } from '../save-message.command-handler';
import { SaveMessageCommand } from '../save-message.command';
import {
  IChatRepository,
  CHAT_REPOSITORY,
} from '../../../../domain/chat/chat.repository';
import { Optional } from 'src/context/shared/domain/optional';
import {
  ChatNotFoundError,
  ChatCanNotSaveMessageError,
} from '../../../../domain/chat/errors/errors';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('SaveMessageCommandHandler', () => {
  let handler: SaveMessageCommandHandler;
  let chatRepository: jest.Mocked<IChatRepository>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  const mockChatId = Uuid.generate();
  const mockSenderId = Uuid.generate();
  const mockMessageId = Uuid.generate();
  const mockMessage = 'Hello world';
  const mockCreatedAt = new Date();

  let mockChat: any;
  let mockUpdatedChat: any;

  beforeEach(async () => {
    mockChat = {
      canAddMessage: jest.fn(),
    };

    mockUpdatedChat = {
      commit: jest.fn(),
    };

    const mockChatRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    const mockEventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue(mockUpdatedChat),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaveMessageCommandHandler,
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

    handler = module.get<SaveMessageCommandHandler>(SaveMessageCommandHandler);
    chatRepository = module.get(CHAT_REPOSITORY);
    eventPublisher = module.get(EventPublisher);

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const command = new SaveMessageCommand(
      mockMessageId,
      mockChatId,
      mockSenderId,
      mockMessage,
      mockCreatedAt,
    );

    it('should save message successfully when chat exists', async () => {
      // Arrange
      mockChat.canAddMessage.mockReturnValue(mockUpdatedChat);
      chatRepository.findById.mockResolvedValue(
        Optional.of({ chat: mockChat }),
      );
      chatRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(chatRepository.findById).toHaveBeenCalledWith(
        expect.objectContaining({ value: mockChatId }),
      );
      expect(mockChat.canAddMessage).toHaveBeenCalledWith({
        chatId: mockChatId,
        content: mockMessage,
        createdAt: mockCreatedAt,
        senderId: mockSenderId,
        id: mockMessageId,
      });
      expect(eventPublisher.mergeObjectContext).toHaveBeenCalledWith(
        mockUpdatedChat,
      );
      expect(chatRepository.save).toHaveBeenCalledWith(mockUpdatedChat);
      expect(mockUpdatedChat.commit).toHaveBeenCalled();
    });

    it('should return error when chat is not found', async () => {
      // Arrange
      chatRepository.findById.mockResolvedValue(Optional.empty());

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ChatNotFoundError);
      }
      expect(chatRepository.findById).toHaveBeenCalledWith(
        expect.objectContaining({ value: mockChatId }),
      );
      expect(mockChat.canAddMessage).not.toHaveBeenCalled();
      expect(chatRepository.save).not.toHaveBeenCalled();
    });

    it('should return error when canAddMessage throws exception', async () => {
      // Arrange
      mockChat.canAddMessage.mockImplementation(() => {
        throw new Error('Cannot add message');
      });
      chatRepository.findById.mockResolvedValue(
        Optional.of({ chat: mockChat }),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ChatCanNotSaveMessageError);
      }
      expect(mockChat.canAddMessage).toHaveBeenCalledWith({
        chatId: mockChatId,
        content: mockMessage,
        createdAt: mockCreatedAt,
        senderId: mockSenderId,
        id: mockMessageId,
      });
      expect(chatRepository.save).not.toHaveBeenCalled();
    });

    it('should return error when repository save fails', async () => {
      // Arrange
      mockChat.canAddMessage.mockReturnValue(mockUpdatedChat);
      chatRepository.findById.mockResolvedValue(
        Optional.of({ chat: mockChat }),
      );
      chatRepository.save.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ChatCanNotSaveMessageError);
      }
      expect(chatRepository.save).toHaveBeenCalledWith(mockUpdatedChat);
      expect(mockUpdatedChat.commit).not.toHaveBeenCalled();
    });

    it('should handle all command parameters correctly', async () => {
      // Arrange
      const customCommand = new SaveMessageCommand(
        Uuid.generate(),
        Uuid.generate(),
        Uuid.generate(),
        'Custom message content',
        new Date('2024-01-01'),
      );
      mockChat.canAddMessage.mockReturnValue(mockUpdatedChat);
      chatRepository.findById.mockResolvedValue(
        Optional.of({ chat: mockChat }),
      );
      chatRepository.save.mockResolvedValue(undefined);

      // Act
      await handler.execute(customCommand);

      // Assert
      expect(mockChat.canAddMessage).toHaveBeenCalledWith({
        chatId: customCommand.chatId,
        content: 'Custom message content',
        createdAt: new Date('2024-01-01'),
        senderId: customCommand.senderId,
        id: customCommand.id,
      });
    });
  });
});
