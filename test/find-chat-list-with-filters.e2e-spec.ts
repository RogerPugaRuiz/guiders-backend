import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { QueryBus } from '@nestjs/cqrs';
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
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from '../src/data-source';
import { ChatEntity } from '../src/context/conversations/chat/infrastructure/chat.entity';

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

describe('FindChatListWithFiltersQuery (e2e)', () => {
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
      imports: [AppModule, TypeOrmModule.forRoot(AppDataSource.options as any)],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    queryBus = app.get(QueryBus);
    chatRepository = app.get(CHAT_REPOSITORY);
    const typeormRepo = app.get(ChatEntity.name + 'Repository');

    // Limpiar y guardar los datos de prueba
    await typeormRepo.delete({});
    for (const chat of chats) {
      await chatRepository.save(chat);
    }
  }, 30000); // Timeout de 30 segundos

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
