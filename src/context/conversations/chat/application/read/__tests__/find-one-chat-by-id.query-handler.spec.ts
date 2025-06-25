import { FindOneChatByIdQueryHandler } from '../find-one-chat-by-id.query-handler';
import { FindOneChatByIdQuery } from '../find-one-chat-by-id.query';
import { ChatPrimitives, Chat } from '../../../domain/chat/chat';
import { IChatRepository } from '../../../domain/chat/chat.repository';
import { Optional } from 'src/context/shared/domain/optional';

describe('FindOneChatByIdQueryHandler', () => {
  let handler: FindOneChatByIdQueryHandler;
  let chatRepository: jest.Mocked<IChatRepository>;

  beforeEach(() => {
    chatRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<IChatRepository>;
    handler = new FindOneChatByIdQueryHandler(chatRepository);
  });

  it('debe devolver el chat serializado si existe', async () => {
    const chatId = 'chat-uuid';
    const chatPrimitives: ChatPrimitives = {
      id: chatId,
      companyId: 'test-company-id',
      participants: [],
      status: 'active',
      lastMessage: null,
      lastMessageAt: null,
      createdAt: new Date(),
    };
    const chat = {
      toPrimitives: () => chatPrimitives,
    } as unknown as Chat;
    chatRepository.findOne.mockResolvedValue(Optional.of({ chat }));

    const result = await handler.execute(new FindOneChatByIdQuery(chatId));
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().chat).toEqual(chatPrimitives);
  });

  it('debe devolver error si el chat no existe', async () => {
    const chatId = 'chat-uuid';
    chatRepository.findOne.mockResolvedValue(Optional.empty());
    const result = await handler.execute(new FindOneChatByIdQuery(chatId));
    expect(result.isErr()).toBe(true);
    expect(() => result.unwrap()).toThrow();
  });
});
