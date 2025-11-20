import { Test, TestingModule } from '@nestjs/testing';
import { MarkMessagesAsReadCommandHandler } from '../mark-messages-as-read.command-handler';
import { MarkMessagesAsReadCommand } from '../mark-messages-as-read.command';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from '../../../domain/message.repository';
import { ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

describe('MarkMessagesAsReadCommandHandler', () => {
  let handler: MarkMessagesAsReadCommandHandler;
  let mockRepository: jest.Mocked<MessageRepository>;

  beforeEach(async () => {
    mockRepository = {
      markAsRead: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkMessagesAsReadCommandHandler,
        {
          provide: MESSAGE_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<MarkMessagesAsReadCommandHandler>(
      MarkMessagesAsReadCommandHandler,
    );
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should mark messages as read successfully', async () => {
      const messageIds = ['msg-1', 'msg-2', 'msg-3'];
      const readBy = 'visitor-123';
      const userRole = 'visitor';

      mockRepository.markAsRead.mockResolvedValue(ok(3));

      const command = new MarkMessagesAsReadCommand(
        messageIds,
        readBy,
        userRole,
      );
      const result = await handler.execute(command);

      expect(result.success).toBe(true);
      expect(result.markedCount).toBe(3);
      expect(mockRepository.markAsRead).toHaveBeenCalledWith(
        messageIds,
        readBy,
      );
    });

    it('should mark single message as read', async () => {
      const messageIds = ['msg-1'];
      const readBy = 'commercial-456';
      const userRole = 'commercial';

      mockRepository.markAsRead.mockResolvedValue(ok(1));

      const command = new MarkMessagesAsReadCommand(
        messageIds,
        readBy,
        userRole,
      );
      const result = await handler.execute(command);

      expect(result.success).toBe(true);
      expect(result.markedCount).toBe(1);
    });

    it('should return zero marked count when repository returns zero', async () => {
      const messageIds = ['msg-1', 'msg-2'];
      const readBy = 'visitor-123';
      const userRole = 'visitor';

      mockRepository.markAsRead.mockResolvedValue(ok(0));

      const command = new MarkMessagesAsReadCommand(
        messageIds,
        readBy,
        userRole,
      );
      const result = await handler.execute(command);

      expect(result.success).toBe(true);
      expect(result.markedCount).toBe(0);
    });

    it('should return failure when repository returns error', async () => {
      const messageIds = ['msg-1', 'msg-2'];
      const readBy = 'visitor-123';
      const userRole = 'visitor';

      // Crear un error concreto en lugar de instanciar la clase abstracta
      class TestDomainError extends DomainError {
        constructor(message: string) {
          super(message);
        }
      }
      const domainError = new TestDomainError('Failed to update messages');
      mockRepository.markAsRead.mockResolvedValue(err(domainError));

      const command = new MarkMessagesAsReadCommand(
        messageIds,
        readBy,
        userRole,
      );
      const result = await handler.execute(command);

      expect(result.success).toBe(false);
      expect(result.markedCount).toBe(0);
    });

    it('should handle exceptions gracefully', async () => {
      const messageIds = ['msg-1'];
      const readBy = 'visitor-123';
      const userRole = 'visitor';

      mockRepository.markAsRead.mockRejectedValue(
        new Error('Unexpected database error'),
      );

      const command = new MarkMessagesAsReadCommand(
        messageIds,
        readBy,
        userRole,
      );
      const result = await handler.execute(command);

      expect(result.success).toBe(false);
      expect(result.markedCount).toBe(0);
    });

    it('should handle empty message array', async () => {
      const messageIds: string[] = [];
      const readBy = 'visitor-123';
      const userRole = 'visitor';

      mockRepository.markAsRead.mockResolvedValue(ok(0));

      const command = new MarkMessagesAsReadCommand(
        messageIds,
        readBy,
        userRole,
      );
      const result = await handler.execute(command);

      expect(result.success).toBe(true);
      expect(result.markedCount).toBe(0);
      expect(mockRepository.markAsRead).toHaveBeenCalledWith([], readBy);
    });
  });
});
