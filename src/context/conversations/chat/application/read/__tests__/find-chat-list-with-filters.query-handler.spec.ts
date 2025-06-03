import { FindChatListWithFiltersQueryHandler } from '../find-chat-list-with-filters.query-handler';
import { FindChatListWithFiltersQuery } from '../find-chat-list-with-filters.query';
import { IChatRepository } from '../../../domain/chat/chat.repository';
import { ChatPrimitives, Chat } from '../../../domain/chat/chat';
import { cursorToBase64 } from 'src/context/shared/domain/cursor/cursor-to-base64.util';

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

  const createMockChat = (id: string, createdAt: Date): Chat => {
    const chatPrimitives: ChatPrimitives = {
      id,
      participants: [
        {
          id: 'commercial-user-uuid',
          name: 'Commercial User',
          isCommercial: true,
          isVisitor: false,
          isOnline: true,
          assignedAt: new Date(),
          lastSeenAt: new Date(),
          isViewing: false,
          isTyping: false,
          isAnonymous: true,
        },
      ],
      status: 'active',
      lastMessage: 'Hello, how can I help you?',
      lastMessageAt: new Date(),
      createdAt,
    };
    return {
      toPrimitives: () => chatPrimitives,
      id: { value: id },
      createdAt: { value: createdAt },
    } as unknown as Chat;
  };

  it('debe devolver la lista de chats del participante con filtros aplicados', async () => {
    const participantId = 'commercial-user-uuid';
    const chat = createMockChat('chat-1', new Date());
    chatRepository.find.mockResolvedValue({ chats: [chat] });

    const result = await handler.execute(
      new FindChatListWithFiltersQuery(participantId, 10, ['lastMessage']),
    );

    expect(result.chats).toHaveLength(1);
    expect(result.chats[0].id).toBe('chat-1');
    expect(result.chats[0].lastMessage).toBe('Hello, how can I help you?');
    expect(result.total).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
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
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
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

  it('debe manejar paginación con cursor correctamente', async () => {
    const participantId = 'commercial-user-uuid';
    const createdAt = new Date('2023-10-15T10:00:00.000Z');
    const chat = createMockChat('chat-1', createdAt);
    const cursor = cursorToBase64<Chat>({
      createdAt,
      id: 'chat-1',
    });

    // Mock primera llamada con cursor
    chatRepository.find.mockResolvedValueOnce({ chats: [chat] });
    // Mock segunda llamada para verificar hasMore (sin más chats)
    chatRepository.find.mockResolvedValueOnce({ chats: [] });
    // Mock tercera llamada para total
    chatRepository.find.mockResolvedValueOnce({ chats: [chat] });

    const result = await handler.execute(
      new FindChatListWithFiltersQuery(participantId, 1, [], cursor),
    );

    expect(result.chats).toHaveLength(1);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('debe indicar hasMore cuando hay más chats disponibles', async () => {
    const participantId = 'commercial-user-uuid';
    const createdAt1 = new Date('2023-10-15T10:00:00.000Z');
    const createdAt2 = new Date('2023-10-15T09:00:00.000Z');
    const chat1 = createMockChat('chat-1', createdAt1);
    const chat2 = createMockChat('chat-2', createdAt2);

    // Mock primera llamada - retorna 2 chats (límite = 2)
    chatRepository.find.mockResolvedValueOnce({ chats: [chat1, chat2] });
    // Mock segunda llamada para verificar hasMore (hay más chats)
    chatRepository.find.mockResolvedValueOnce({
      chats: [createMockChat('chat-3', new Date('2023-10-15T08:00:00.000Z'))],
    });
    // Mock tercera llamada para total
    chatRepository.find.mockResolvedValueOnce({ chats: [chat1, chat2] });

    const result = await handler.execute(
      new FindChatListWithFiltersQuery(participantId, 2),
    );

    expect(result.chats).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).not.toBeNull();
  });

  it('debe generar cursor correcto basado en el último chat', async () => {
    const participantId = 'commercial-user-uuid';
    const createdAt = new Date('2023-10-15T10:00:00.000Z');
    const chat = createMockChat('chat-1', createdAt);

    // Mock primera llamada
    chatRepository.find.mockResolvedValueOnce({ chats: [chat] });
    // Mock segunda llamada para verificar hasMore
    chatRepository.find.mockResolvedValueOnce({
      chats: [createMockChat('chat-2', new Date('2023-10-15T09:00:00.000Z'))],
    });
    // Mock tercera llamada para total
    chatRepository.find.mockResolvedValueOnce({ chats: [chat] });

    const result = await handler.execute(
      new FindChatListWithFiltersQuery(participantId, 1),
    );

    expect(result.nextCursor).not.toBeNull();
    if (result.nextCursor) {
      const expectedCursor = cursorToBase64<Chat>({
        createdAt,
        id: 'chat-1',
      });
      expect(result.nextCursor).toBe(expectedCursor);
    }
  });
});
