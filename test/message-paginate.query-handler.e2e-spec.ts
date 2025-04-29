import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { MessagePaginateQueryHandler } from '../../src/context/chat-context/message/application/paginate/message-paginate.query-handler';
import { IMessageRepository } from '../../src/context/chat-context/message/domain/message.repository';
import { MessagePaginateQuery } from '../../src/context/chat-context/message/application/paginate/message-paginate.query';
import { Result } from '../../src/context/shared/domain/result';
import { Message } from '../../src/context/chat-context/message/domain/message';

// Mock del repositorio de mensajes
const mockMessageRepository = {
  find: jest.fn(),
};

describe('MessagePaginateQueryHandler (Integration)', () => {
  let queryHandler: MessagePaginateQueryHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        MessagePaginateQueryHandler,
        {
          provide: 'MESSAGE_REPOSITORY',
          useValue: mockMessageRepository,
        },
      ],
    }).compile();

    queryHandler = module.get<MessagePaginateQueryHandler>(MessagePaginateQueryHandler);
  });

  it('should return paginated messages successfully', async () => {
    // Datos de prueba
    const chatId = 'test-chat-id';
    const cursor = null;
    const limit = 2;
    const messages = [
      new Message({
        id: { value: '1' },
        chatId: { value: chatId },
        createdAt: { value: new Date() },
        content: { value: 'Message 1' },
      }),
      new Message({
        id: { value: '2' },
        chatId: { value: chatId },
        createdAt: { value: new Date() },
        content: { value: 'Message 2' },
      }),
    ];

    mockMessageRepository.find.mockResolvedValue({ messages });

    const query = new MessagePaginateQuery(chatId, cursor, limit);
    const result: Result<any, any> = await queryHandler.execute(query);

    expect(result.isOk()).toBe(true);
    expect(result.value.messages).toHaveLength(2);
    expect(result.value.cursor).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    mockMessageRepository.find.mockRejectedValue(new Error('Database error'));

    const query = new MessagePaginateQuery('test-chat-id', null, 2);
    const result: Result<any, any> = await queryHandler.execute(query);

    expect(result.isErr()).toBe(true);
  });
});