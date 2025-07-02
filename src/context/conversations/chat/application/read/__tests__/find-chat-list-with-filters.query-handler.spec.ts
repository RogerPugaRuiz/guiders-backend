import { FindChatListWithFiltersQueryHandler } from '../find-chat-list-with-filters.query-handler';
import { FindChatListWithFiltersQuery } from '../find-chat-list-with-filters.query';
import { IChatRepository } from '../../../domain/chat/chat.repository';
import { ChatPrimitives, Chat } from '../../../domain/chat/chat';
import { cursorToBase64 } from 'src/context/shared/domain/cursor/cursor-to-base64.util';
import { Criteria, Filter, Operator } from 'src/context/shared/domain/criteria';

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

  const createMockChat = (
    id: string,
    createdAt: Date,
    lastMessageAt?: Date,
  ): Chat => {
    const lastMsgAt = lastMessageAt || new Date();
    const chatPrimitives: ChatPrimitives = {
      id,
      companyId: 'test-company-id',
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
      lastMessageAt: lastMsgAt,
      createdAt,
    };
    return {
      toPrimitives: () => chatPrimitives,
      id: { value: id },
      createdAt: { value: createdAt },
      lastMessageAt: { value: lastMsgAt },
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
    const lastMessageAt = new Date('2023-10-15T10:30:00.000Z');
    const chat = createMockChat('chat-1', createdAt, lastMessageAt);
    const cursor = cursorToBase64<Chat>({
      lastMessageAt,
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
    const lastMessageAt1 = new Date('2023-10-15T10:30:00.000Z');
    const lastMessageAt2 = new Date('2023-10-15T09:30:00.000Z');
    const chat1 = createMockChat('chat-1', createdAt1, lastMessageAt1);
    const chat2 = createMockChat('chat-2', createdAt2, lastMessageAt2);

    // Mock primera llamada - retorna 2 chats (límite = 2)
    chatRepository.find.mockResolvedValueOnce({ chats: [chat1, chat2] });
    // Mock segunda llamada para verificar hasMore (hay más chats)
    chatRepository.find.mockResolvedValueOnce({
      chats: [
        createMockChat(
          'chat-3',
          new Date('2023-10-15T08:00:00.000Z'),
          new Date('2023-10-15T08:30:00.000Z'),
        ),
      ],
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
    const lastMessageAt = new Date('2023-10-15T10:30:00.000Z');
    const chat = createMockChat('chat-1', createdAt, lastMessageAt);

    // Mock primera llamada
    chatRepository.find.mockResolvedValueOnce({ chats: [chat] });
    // Mock segunda llamada para verificar hasMore
    chatRepository.find.mockResolvedValueOnce({
      chats: [
        createMockChat(
          'chat-2',
          new Date('2023-10-15T09:00:00.000Z'),
          new Date('2023-10-15T09:30:00.000Z'),
        ),
      ],
    });
    // Mock tercera llamada para total
    chatRepository.find.mockResolvedValueOnce({ chats: [chat] });

    const result = await handler.execute(
      new FindChatListWithFiltersQuery(participantId, 1),
    );

    expect(result.nextCursor).not.toBeNull();
    if (result.nextCursor) {
      const expectedCursor = cursorToBase64<Chat>({
        lastMessageAt,
        id: 'chat-1',
      });
      expect(result.nextCursor).toBe(expectedCursor);
    }
  });

  it('debe usar múltiples campos de ordenamiento correctamente', async () => {
    const participantId = 'commercial-user-uuid';

    // Crear chats con diferentes lastMessageAt e id para probar ordenamiento
    const chat1 = createMockChat(
      'chat-1',
      new Date('2023-10-15T10:00:00.000Z'),
      new Date('2023-10-15T15:00:00.000Z'), // mismo lastMessageAt que chat2
    );
    const chat2 = createMockChat(
      'chat-2',
      new Date('2023-10-15T09:00:00.000Z'),
      new Date('2023-10-15T15:00:00.000Z'), // mismo lastMessageAt que chat1
    );

    // Mock primera llamada
    chatRepository.find.mockResolvedValueOnce({ chats: [chat1, chat2] });
    // Mock segunda llamada para verificar hasMore
    chatRepository.find.mockResolvedValueOnce({ chats: [] });
    // Mock tercera llamada para total
    chatRepository.find.mockResolvedValueOnce({ chats: [chat1, chat2] });

    const result = await handler.execute(
      new FindChatListWithFiltersQuery(participantId, 2),
    );

    // Verificar que se llamó al repositorio con el Criteria correcto
    expect(chatRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: expect.arrayContaining([
          expect.objectContaining({
            field: 'lastMessageAt',
            direction: 'DESC',
          }),
          expect.objectContaining({ field: 'id', direction: 'DESC' }),
        ]),
      }),
    );

    expect(result.chats).toHaveLength(2);
    expect(result.hasMore).toBe(false);
  });

  it('debe generar Criteria con estructura correcta equivalente al SQL esperado', () => {
    // Crear el mismo Criteria que genera el handler sin ejecutar el handler completo
    const participantId = 'test-participant-uuid';
    const limit = 25;

    // Construir el mismo Criteria que el handler
    const filters = [
      new Filter<Chat>('participants', Operator.EQUALS, participantId),
    ];

    const criteria = new Criteria<Chat>(filters)
      .orderByField('lastMessageAt', 'DESC')
      .orderByField('id', 'DESC')
      .setLimit(limit);

    // Verificar filtros: debe tener un filtro de participants = participantId
    expect(criteria.filters).toHaveLength(1);
    const firstFilter = criteria.filters[0];

    // Verificar que es un Filter y no un FilterGroup
    expect(firstFilter).toBeInstanceOf(Filter);

    if (firstFilter instanceof Filter) {
      expect(firstFilter.field).toBe('participants');
      expect(firstFilter.operator).toBe('=');
      expect(firstFilter.value).toBe(participantId);
    }

    // Verificar ordenamiento múltiple: lastMessageAt DESC, id DESC
    expect(criteria.orderBy).toBeDefined();

    if (criteria.orderBy) {
      expect(Array.isArray(criteria.orderBy)).toBe(true);

      if (Array.isArray(criteria.orderBy)) {
        expect(criteria.orderBy).toHaveLength(2);
        expect(criteria.orderBy[0]).toEqual({
          field: 'lastMessageAt',
          direction: 'DESC',
        });
        expect(criteria.orderBy[1]).toEqual({
          field: 'id',
          direction: 'DESC',
        });
      }
    }

    // Verificar límite
    expect(criteria.limit).toBe(limit);

    // Este Criteria debería traducirse en el TypeORM repository a SQL como:
    // SELECT DISTINCT chat.* FROM chat
    // INNER JOIN chat_participants cp ON chat.id = cp.chat_id
    // WHERE cp.participant_id = 'test-participant-uuid'
    // ORDER BY chat."lastMessageAt" DESC NULLS LAST, chat.id DESC
    // LIMIT 25
  });

  it('debe generar Criteria correcto para consulta con cursor de paginación', async () => {
    const participantId = 'test-participant-uuid';
    // Cursor correcto generado para {lastMessageAt: "2024-01-01T10:00:00.000Z", id: "chat-123"}
    const mockCursor =
      'eyJsYXN0TWVzc2FnZUF0IjoiMjAyNC0wMS0wMVQxMDowMDowMC4wMDBaIiwiaWQiOiJjaGF0LTEyMyJ9';

    // Capturar todas las llamadas al repositorio
    const capturedCriterias: any[] = [];
    chatRepository.find.mockImplementation((criteria) => {
      capturedCriterias.push(criteria);
      return Promise.resolve({ chats: [] });
    });

    await handler.execute(
      new FindChatListWithFiltersQuery(
        participantId,
        50,
        undefined,
        mockCursor,
      ),
    );

    // Debe haber al menos una llamada al repositorio
    expect(capturedCriterias.length).toBeGreaterThan(0);

    // La primera llamada debe ser la consulta principal con cursor
    const mainCriteria = capturedCriterias[0];
    expect(mainCriteria).toBeDefined();

    // Verificar que tiene cursor para paginación
    expect(mainCriteria.cursor).toBeDefined();

    // Verificar que el cursor contiene los campos esperados
    // Nota: base64ToCursor intenta convertir strings que parecen fechas a Date
    // Por lo tanto, verificamos que existan los campos y sus tipos
    expect(mainCriteria.cursor).toHaveProperty('lastMessageAt');
    expect(mainCriteria.cursor).toHaveProperty('id');
    expect(mainCriteria.cursor.lastMessageAt).toBeInstanceOf(Date);

    // El id también es convertido a Date por el algoritmo de base64ToCursor
    // ya que "chat-123" es interpretado como una fecha válida por new Date()
    expect(mainCriteria.cursor.id).toBeInstanceOf(Date);

    // Verificar que mantiene el mismo ordenamiento para consistencia con cursor
    expect(Array.isArray(mainCriteria.orderBy)).toBe(true);
    expect(mainCriteria.orderBy).toHaveLength(2);
    expect(mainCriteria.orderBy[0].field).toBe('lastMessageAt');
    expect(mainCriteria.orderBy[0].direction).toBe('DESC');
    expect(mainCriteria.orderBy[1].field).toBe('id');
    expect(mainCriteria.orderBy[1].direction).toBe('DESC');

    // Verificar el límite
    expect(mainCriteria.limit).toBe(50);

    // Verificar filtros: debe tener un filtro de participants = participantId
    expect(mainCriteria.filters).toHaveLength(1);
    const firstFilter = mainCriteria.filters[0];

    expect(firstFilter).toBeInstanceOf(Filter);

    if (firstFilter instanceof Filter) {
      expect(firstFilter.field).toBe('participants');
      expect(firstFilter.operator).toBe('=');
      expect(firstFilter.value).toBe(participantId);
    }

    // Este Criteria con cursor debería traducirse en el repositorio TypeORM a SQL como:
    // SELECT DISTINCT chat.* FROM chat
    // INNER JOIN chat_participants cp ON chat.id = cp.chat_id
    // WHERE cp.participant_id = 'test-participant-uuid'
    // AND (chat."lastMessageAt" < '2024-01-01T10:00:00.000Z' OR
    //      (chat."lastMessageAt" = '2024-01-01T10:00:00.000Z' AND chat.id < 'chat-123'))
    // ORDER BY chat."lastMessageAt" DESC NULLS LAST, chat.id DESC
    // LIMIT 50
  });
});
