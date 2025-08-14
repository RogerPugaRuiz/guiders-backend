import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import { FindChatListWithFiltersQuery } from '../src/context/conversations/chat/application/read/find-chat-list-with-filters.query';
import { ChatListResponse } from '../src/context/conversations/chat/application/read/find-chat-list-with-filters.query-handler';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../src/context/conversations/chat/domain/chat/chat.repository';
import {
  Chat,
  ChatPrimitives,
} from '../src/context/conversations/chat/domain/chat/chat';
import { Uuid } from '../src/context/shared/domain/value-objects/uuid';
import { Criteria, Operator } from '../src/context/shared/domain/criteria';
import { ChatId } from '../src/context/conversations/chat/domain/chat/value-objects/chat-id';
import { Optional } from '../src/context/shared/domain/optional';
import { FindChatListWithFiltersQueryHandler } from '../src/context/conversations/chat/application/read/find-chat-list-with-filters.query-handler';

// Función auxiliar para crear un chat de prueba
const createTestChat = (
  id: string,
  participantIds: string[],
  lastMessageAt: Date,
  companyId: string,
): Chat => {
  const chatPrimitives: ChatPrimitives = {
    id: id,
    companyId: companyId,
    participants: participantIds.map((pId) => ({
      id: pId,
      name: `Participant ${pId}`,
      isCommercial: false,
      isVisitor: true,
      isOnline: false,
      assignedAt: new Date(),
      lastSeenAt: null,
      isViewing: false,
      isTyping: false,
      isAnonymous: false,
    })),
    status: 'ACTIVE',
    lastMessage: 'last message content',
    lastMessageAt: lastMessageAt,
    createdAt: new Date(),
  };
  return Chat.fromPrimitives(chatPrimitives);
};

// Repositorio en memoria para aislar el test de la infraestructura
class InMemoryChatRepository implements IChatRepository {
  private chats: Chat[] = [];

  save(chat: Chat): Promise<void> {
    const idx = this.chats.findIndex((c) => c.id.value === chat.id.value);
    if (idx >= 0) {
      this.chats[idx] = chat;
    } else {
      this.chats.push(chat);
    }
    return Promise.resolve();
  }

  findById(id: ChatId): Promise<Optional<{ chat: Chat }>> {
    const found = this.chats.find((c) => c.id.value === id.value);
    return Promise.resolve(
      found ? Optional.of({ chat: found }) : Optional.empty(),
    );
  }

  findOne(criteria: Criteria<Chat>): Promise<Optional<{ chat: Chat }>> {
    return this.find(criteria.setLimit(1)).then(({ chats }) =>
      chats.length ? Optional.of({ chat: chats[0] }) : Optional.empty(),
    );
  }

  find(criteria: Criteria<Chat>): Promise<{ chats: Chat[] }> {
    let result = [...this.chats];
    // DEBUG: tamaños iniciales y criterio

    console.log('[InMemoryChatRepository] total chats:', result.length);

    // Filtros (solo los necesarios para el test: participants)
    if (criteria.filters?.length) {
      criteria.filters.forEach((filter: any) => {
        if (
          filter.field === 'participants' &&
          filter.operator === Operator.EQUALS
        ) {
          result = result.filter((chat) =>
            chat.participants.hasParticipant(filter.value),
          );
        }
      });
    }

    console.log('[InMemoryChatRepository] after filter count:', result.length);

    // Orden (lastMessageAt DESC, id DESC)
    if (criteria.orderBy) {
      const orderList = Array.isArray(criteria.orderBy)
        ? criteria.orderBy
        : [criteria.orderBy];
      result.sort((a, b) => {
        for (const ord of orderList) {
          let cmp = 0;
          if (ord.field === 'lastMessageAt') {
            const av = a.lastMessageAt
              ? a.lastMessageAt.value.getTime()
              : -Infinity;
            const bv = b.lastMessageAt
              ? b.lastMessageAt.value.getTime()
              : -Infinity;
            cmp = av === bv ? 0 : av > bv ? 1 : -1;
          } else if (ord.field === 'id') {
            cmp = a.id.value.localeCompare(b.id.value);
          }
          if (cmp !== 0) {
            return ord.direction === 'DESC' ? -cmp : cmp;
          }
        }
        return 0;
      });
    }

    // Cursor (lastMessageAt + id) para paginación
    if (criteria.cursor && 'id' in criteria.cursor) {
      const cursorLastRaw =
        'lastMessageAt' in criteria.cursor
          ? (criteria.cursor as any).lastMessageAt
          : null;
      const cursorId = criteria.cursor.id as string;
      const cursorTs =
        cursorLastRaw instanceof Date
          ? cursorLastRaw.getTime()
          : cursorLastRaw
            ? new Date(cursorLastRaw as string).getTime()
            : null;

      result = result.filter((chat) => {
        const chatTs = chat.lastMessageAt
          ? chat.lastMessageAt.value.getTime()
          : Number.NEGATIVE_INFINITY;

        if (cursorTs !== null) {
          if (chatTs < cursorTs) return true;
          if (chatTs === cursorTs && chat.id.value < cursorId) return true;
          return false;
        }
        // Si no hay fecha en el cursor, solo usar id
        return chat.id.value < cursorId;
      });
    }

    if (criteria.cursor) {
      console.log(
        '[InMemoryChatRepository] after cursor count:',
        result.length,
      );
    }

    // Límite
    if (criteria.limit !== undefined) {
      result = result.slice(0, criteria.limit);
    }

    if (criteria.limit !== undefined) {
      console.log(
        '[InMemoryChatRepository] after limit (',
        criteria.limit,
        ') count:',
        result.length,
      );
    }

    return Promise.resolve({ chats: result });
  }

  findAll(): Promise<{ chats: Chat[] }> {
    return Promise.resolve({ chats: [...this.chats] });
  }
}

describe('FindChatListWithFiltersQuery (e2e - in memory)', () => {
  let app: INestApplication;
  let queryBus: QueryBus;
  let chatRepository: IChatRepository;

  const participant1Id = Uuid.random().value;
  const participant2Id = Uuid.random().value;
  const companyId = Uuid.random().value;

  // Creación de chats de prueba
  const chats: Chat[] = [
    createTestChat(
      Uuid.random().value,
      [participant1Id, Uuid.random().value],
      new Date('2025-07-03T10:00:00Z'),
      companyId,
    ),
    createTestChat(
      Uuid.random().value,
      [participant1Id, Uuid.random().value],
      new Date('2025-07-03T09:00:00Z'),
      companyId,
    ),
    createTestChat(
      Uuid.random().value,
      [participant1Id, Uuid.random().value],
      new Date('2025-07-03T08:00:00Z'),
      companyId,
    ),
    createTestChat(
      Uuid.random().value,
      [participant1Id, Uuid.random().value],
      new Date('2025-07-03T07:00:00Z'),
      companyId,
    ),
    createTestChat(
      Uuid.random().value,
      [participant2Id, Uuid.random().value],
      new Date('2025-07-03T11:00:00Z'),
      companyId,
    ),
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        FindChatListWithFiltersQueryHandler,
        { provide: CHAT_REPOSITORY, useClass: InMemoryChatRepository },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    queryBus = app.get(QueryBus);
    chatRepository = app.get(CHAT_REPOSITORY);

    for (const chat of chats) {
      await chatRepository.save(chat);
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should return the first page of chats for a participant, sorted by lastMessageAt', async () => {
    const limit = 2;
    const query = new FindChatListWithFiltersQuery(participant1Id, limit);

    const result: ChatListResponse = await queryBus.execute(query);

    // Comprobaciones
    expect(result.chats).toHaveLength(limit);
    expect(result.total).toBe(4);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).not.toBeNull();

    // Verificar que los chats son los correctos y están ordenados
    expect(result.chats[0].id).toBe(chats[0].id.value);
    expect(result.chats[1].id).toBe(chats[1].id.value);
  });

  it('should return the second page of chats using the cursor', async () => {
    const limit = 2;
    // Primera llamada para obtener el cursor
    const firstQuery = new FindChatListWithFiltersQuery(participant1Id, limit);
    const firstResult: ChatListResponse = await queryBus.execute(firstQuery);

    // Segunda llamada con el cursor
    const secondQuery = new FindChatListWithFiltersQuery(
      participant1Id,
      limit,
      undefined,
      firstResult.nextCursor!,
    );
    const secondResult: ChatListResponse = await queryBus.execute(secondQuery);

    // Comprobaciones
    expect(secondResult.chats).toHaveLength(limit);
    expect(secondResult.total).toBe(4);
    expect(secondResult.hasMore).toBe(false); // No hay más páginas después de esta
    expect(secondResult.nextCursor).toBeNull();

    // Verificar que los chats son los correctos y están ordenados
    expect(secondResult.chats[0].id).toBe(chats[2].id.value);
    expect(secondResult.chats[1].id).toBe(chats[3].id.value);
  });

  it('should return an empty list if participant has no chats', async () => {
    const unknownParticipantId = Uuid.random().value;
    const query = new FindChatListWithFiltersQuery(unknownParticipantId, 5);

    const result: ChatListResponse = await queryBus.execute(query);

    expect(result.chats).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('should correctly handle hasMore when the number of items is exactly the limit', async () => {
    // Hay 4 chats para el participante 1
    const limit = 4;
    const query = new FindChatListWithFiltersQuery(participant1Id, limit);
    const result: ChatListResponse = await queryBus.execute(query);

    expect(result.chats).toHaveLength(4);
    expect(result.total).toBe(4);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });
});
