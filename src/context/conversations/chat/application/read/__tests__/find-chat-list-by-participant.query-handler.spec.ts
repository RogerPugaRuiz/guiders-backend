import { FindChatListByParticipantQueryHandler } from '../find-chat-list-by-participant.query-handler';
import { FindChatListByParticipantQuery } from '../find-chat-list-by-participant.query';
import { IChatRepository } from '../../../domain/chat/chat.repository';
import { ChatPrimitives, Chat } from '../../../domain/chat/chat';

describe('FindChatListByParticipantQueryHandler', () => {
  let handler: FindChatListByParticipantQueryHandler;
  let chatRepository: jest.Mocked<IChatRepository>;

  beforeEach(() => {
    chatRepository = {
      find: jest.fn(),
      // Métodos no usados pero requeridos por la interfaz
      save: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
    } as unknown as jest.Mocked<IChatRepository>;
    handler = new FindChatListByParticipantQueryHandler(chatRepository);
  });

  it('debe devolver la lista de chats del participante', async () => {
    const participantId = 'user-uuid';
    const chatPrimitives: ChatPrimitives = {
      id: 'chat-1',
      participants: [],
      status: 'active',
      lastMessage: null,
      lastMessageAt: null,
      createdAt: new Date(),
    };
    const chat = { toPrimitives: () => chatPrimitives } as unknown as Chat;
    chatRepository.find.mockResolvedValue({ chats: [chat] });
    const result = await handler.execute(
      new FindChatListByParticipantQuery(participantId),
    );
    expect(result.chats).toHaveLength(1);
    expect(result.chats[0].id).toBe('chat-1');
  });

  it('debe devolver lista vacía si el participante no tiene chats', async () => {
    const participantId = 'user-uuid';
    chatRepository.find.mockResolvedValue({ chats: [] });
    const result = await handler.execute(
      new FindChatListByParticipantQuery(participantId),
    );
    expect(result.chats).toHaveLength(0);
  });
});
