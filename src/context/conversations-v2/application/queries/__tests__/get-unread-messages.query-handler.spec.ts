import { Test, TestingModule } from '@nestjs/testing';
import { GetUnreadMessagesQueryHandler } from '../get-unread-messages.query-handler';
import { GetUnreadMessagesQuery } from '../get-unread-messages.query';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from '../../../domain/message.repository';
import { Message } from '../../../domain/entities/message.aggregate';
import { ok } from 'src/context/shared/domain/result';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('GetUnreadMessagesQueryHandler', () => {
  let handler: GetUnreadMessagesQueryHandler;
  let mockRepository: jest.Mocked<MessageRepository>;

  beforeEach(async () => {
    mockRepository = {
      match: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUnreadMessagesQueryHandler,
        {
          provide: MESSAGE_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<GetUnreadMessagesQueryHandler>(
      GetUnreadMessagesQueryHandler,
    );
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return unread messages for a visitor', async () => {
      const chatId = Uuid.random().value;
      const userId = Uuid.random().value;
      const userRole = 'visitor';
      const commercialId = Uuid.random().value;

      const mockMessage = Message.createTextMessage({
        chatId,
        senderId: commercialId,
        content: 'Hola, ¿en qué puedo ayudarte?',
        isFirstResponse: true,
      });

      mockRepository.match.mockResolvedValue(ok([mockMessage]));

      const query = new GetUnreadMessagesQuery(chatId, userId, userRole);
      const result = await handler.execute(query);

      expect(result).toHaveLength(1);
      expect(result[0].chatId).toBe(chatId);
      expect(result[0].isRead).toBe(false);
      expect(mockRepository.match).toHaveBeenCalledTimes(1);
    });

    it('should exclude internal messages for visitors', async () => {
      const chatId = Uuid.random().value;
      const userId = Uuid.random().value;
      const userRole = 'visitor';

      mockRepository.match.mockResolvedValue(ok([]));

      const query = new GetUnreadMessagesQuery(chatId, userId, userRole);
      await handler.execute(query);

      // Verificar que se aplicó el filtro de isInternal = false para visitantes
      const callArgs = mockRepository.match.mock.calls[0][0];
      expect(callArgs.filters).toContainEqual(
        expect.objectContaining({
          field: 'isInternal',
          value: false,
        }),
      );
    });

    it('should exclude messages from the same user', async () => {
      const chatId = Uuid.random().value;
      const userId = Uuid.random().value;
      const userRole = 'visitor';

      mockRepository.match.mockResolvedValue(ok([]));

      const query = new GetUnreadMessagesQuery(chatId, userId, userRole);
      await handler.execute(query);

      // Verificar que se excluyeron mensajes del propio usuario
      const callArgs = mockRepository.match.mock.calls[0][0];
      expect(callArgs.filters).toContainEqual(
        expect.objectContaining({
          field: 'senderId',
          value: userId,
        }),
      );
    });

    it('should return empty array when repository returns error', async () => {
      const chatId = Uuid.random().value;
      const userId = Uuid.random().value;
      const userRole = 'visitor';

      mockRepository.match.mockResolvedValue({
        isErr: () => true,
        error: { message: 'Database error' },
      } as any);

      const query = new GetUnreadMessagesQuery(chatId, userId, userRole);
      const result = await handler.execute(query);

      expect(result).toEqual([]);
    });

    it('should return empty array when exception is thrown', async () => {
      const chatId = Uuid.random().value;
      const userId = Uuid.random().value;
      const userRole = 'visitor';

      mockRepository.match.mockRejectedValue(new Error('Unexpected error'));

      const query = new GetUnreadMessagesQuery(chatId, userId, userRole);
      const result = await handler.execute(query);

      expect(result).toEqual([]);
    });
  });
});
