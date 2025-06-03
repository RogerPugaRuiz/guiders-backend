import { Test, TestingModule } from '@nestjs/testing';
import { UpdateParticipantNameCommandHandler } from '../update-participant-name.command-handler';
import { UpdateParticipantNameCommand } from '../update-participant-name.command';
import {
  IChatRepository,
  CHAT_REPOSITORY,
} from '../../../../../domain/chat/chat.repository';
import { Chat } from '../../../../../domain/chat/chat';

describe('UpdateParticipantNameCommandHandler', () => {
  let handler: UpdateParticipantNameCommandHandler;
  let mockChatRepository: jest.Mocked<IChatRepository>;

  // Mock para un chat que contiene el participante
  const mockChatWithParticipant = {
    hasParticipant: jest.fn().mockReturnValue(true),
    updateParticipantName: jest.fn().mockReturnThis(),
  } as unknown as Chat;

  // Mock para un chat que no contiene el participante
  const mockChatWithoutParticipant = {
    hasParticipant: jest.fn().mockReturnValue(false),
    updateParticipantName: jest.fn().mockReturnThis(),
  } as unknown as Chat;

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateParticipantNameCommandHandler,
        {
          provide: CHAT_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<UpdateParticipantNameCommandHandler>(
      UpdateParticipantNameCommandHandler,
    );
    mockChatRepository = module.get<IChatRepository>(
      CHAT_REPOSITORY,
    ) as jest.Mocked<IChatRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should update participant name in all chats where participant exists', async () => {
      // Arrange
      const command = new UpdateParticipantNameCommand(
        'visitor-123',
        'Brave Lion',
      );

      mockChatRepository.findAll.mockResolvedValue({
        chats: [mockChatWithParticipant, mockChatWithoutParticipant],
      });

      // Act
      await handler.execute(command);

      // Assert
      expect(mockChatRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockChatWithParticipant.hasParticipant).toHaveBeenCalledWith(
        'visitor-123',
      );
      expect(mockChatWithoutParticipant.hasParticipant).toHaveBeenCalledWith(
        'visitor-123',
      );
      expect(
        mockChatWithParticipant.updateParticipantName,
      ).toHaveBeenCalledWith('visitor-123', 'Brave Lion');
      expect(
        mockChatWithoutParticipant.updateParticipantName,
      ).not.toHaveBeenCalled();
      expect(mockChatRepository.save).toHaveBeenCalledTimes(1);
      expect(mockChatRepository.save).toHaveBeenCalledWith(
        mockChatWithParticipant,
      );
    });

    it('should handle case when no chats contain the participant', async () => {
      // Arrange
      const command = new UpdateParticipantNameCommand(
        'visitor-456',
        'Swift Eagle',
      );

      mockChatRepository.findAll.mockResolvedValue({
        chats: [mockChatWithoutParticipant],
      });

      // Act
      await handler.execute(command);

      // Assert
      expect(mockChatRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockChatWithoutParticipant.hasParticipant).toHaveBeenCalledWith(
        'visitor-456',
      );
      expect(
        mockChatWithoutParticipant.updateParticipantName,
      ).not.toHaveBeenCalled();
      expect(mockChatRepository.save).not.toHaveBeenCalled();
    });

    it('should handle empty chat list', async () => {
      // Arrange
      const command = new UpdateParticipantNameCommand(
        'visitor-789',
        'Clever Fox',
      );

      mockChatRepository.findAll.mockResolvedValue({ chats: [] });

      // Act
      await handler.execute(command);

      // Assert
      expect(mockChatRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockChatRepository.save).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      // Arrange
      const command = new UpdateParticipantNameCommand(
        'visitor-error',
        'Error Name',
      );

      const error = new Error('Database connection failed');
      mockChatRepository.findAll.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
