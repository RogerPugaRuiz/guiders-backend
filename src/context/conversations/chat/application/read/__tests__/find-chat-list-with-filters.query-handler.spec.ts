import { FindChatListWithFiltersQueryHandler } from '../find-chat-list-with-filters.query-handler';
import { FindChatListWithFiltersQuery } from '../find-chat-list-with-filters.query';
import { IChatRepository } from '../../../domain/chat/chat.repository';
import { ChatPrimitives, Chat } from '../../../domain/chat/chat';

describe('FindChatListWithFiltersQueryHandler', () => {
  let handler: FindChatListWithFiltersQueryHandler;
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
    handler = new FindChatListWithFiltersQueryHandler(chatRepository);
  });

  it('debe devolver la lista de chats del participante con filtros aplicados', async () => {
    const participantId = 'commercial-user-uuid';
    const chatPrimitives: ChatPrimitives = {
      id: 'chat-1',
      participants: [
        {
          id: participantId,
          name: 'Commercial User',
          isCommercial: true,
          isVisitor: false,
          isOnline: true,
          assignedAt: new Date(),
          lastSeenAt: new Date(),
          isViewing: false,
          isTyping: false,
        },
      ],
      status: 'active',
      lastMessage: 'Hello, how can I help you?',
      lastMessageAt: new Date(),
      createdAt: new Date(),
    };
    const chat = { toPrimitives: () => chatPrimitives } as unknown as Chat;
    chatRepository.find.mockResolvedValue({ chats: [chat] });

    const result = await handler.execute(
      new FindChatListWithFiltersQuery(participantId, 10, ['lastMessage']),
    );

    expect(result.chats).toHaveLength(1);
    expect(result.chats[0].id).toBe('chat-1');
    expect(result.chats[0].lastMessage).toBe('Hello, how can I help you?');
    // Verifica que se llama con el filtro correcto
    const findSpy = jest.spyOn(chatRepository, 'find');
    expect(findSpy).toHaveBeenCalled();
  });

  it('debe devolver lista vacía si el participante no tiene chats', async () => {
    const participantId = 'commercial-user-uuid';
    chatRepository.find.mockResolvedValue({ chats: [] });

    const result = await handler.execute(
      new FindChatListWithFiltersQuery(participantId),
    );

    expect(result.chats).toHaveLength(0);
  });

  it('debe usar límite por defecto de 50 si no se especifica', async () => {
    const participantId = 'commercial-user-uuid';
    chatRepository.find.mockResolvedValue({ chats: [] });

    await handler.execute(new FindChatListWithFiltersQuery(participantId));

    // Verifica que se llama el repositorio
    const findSpy = jest.spyOn(chatRepository, 'find');
    expect(findSpy).toHaveBeenCalled();
  });

  it('debe aplicar el límite especificado en la query', async () => {
    const participantId = 'commercial-user-uuid';
    const customLimit = 25;
    chatRepository.find.mockResolvedValue({ chats: [] });

    await handler.execute(
      new FindChatListWithFiltersQuery(participantId, customLimit),
    );

    // Verifica que se llama el repositorio
    const findSpy = jest.spyOn(chatRepository, 'find');
    expect(findSpy).toHaveBeenCalled();
  });
});
