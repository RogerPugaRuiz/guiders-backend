import * as dotenv from 'dotenv';
dotenv.config();
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatEntity } from './chat.entity';
import { ParticipantsEntity } from './participants.entity';
import { MessageEntity } from '../../message/infrastructure/entities/message.entity';
import { TypeOrmChatService } from './typeORM-chat.service';
import { CHAT_REPOSITORY } from '../domain/chat/chat.repository';
import { MESSAGE_REPOSITORY } from '../../message/domain/message.repository';
import { TypeOrmMessageService } from '../../message/infrastructure/typeORM-message.service';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { Chat } from '../domain/chat/chat';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

// Prueba de integración para ChatRepository
// Verifica que el repositorio encuentra correctamente chats donde el usuario es participante
describe('ChatRepository (integration)', () => {
  let chatRepository: TypeOrmChatService;
  let chatEntityRepository: Repository<ChatEntity>;
  let participantsEntityRepository: Repository<ParticipantsEntity>;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DATABASE_HOST,
          port: Number(process.env.TEST_DATABASE_PORT),
          username: process.env.TEST_DATABASE_USERNAME,
          password: process.env.TEST_DATABASE_PASSWORD,
          database: process.env.TEST_DATABASE,
          dropSchema: true,
          entities: [ChatEntity, ParticipantsEntity, MessageEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([ChatEntity, ParticipantsEntity, MessageEntity]),
      ],
      providers: [
        { provide: CHAT_REPOSITORY, useClass: TypeOrmChatService },
        { provide: MESSAGE_REPOSITORY, useClass: TypeOrmMessageService },
      ],
    }).compile();

    chatRepository = module.get<TypeOrmChatService>(CHAT_REPOSITORY);
    chatEntityRepository = module.get('ChatEntityRepository');
    participantsEntityRepository = module.get('ParticipantsEntityRepository');
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Limpiar datos de prueba antes de cada test
    await chatEntityRepository.query('DELETE FROM chat_participants');
    await chatEntityRepository.query('DELETE FROM chats');
    await participantsEntityRepository.query('DELETE FROM participants');
  });

  describe('find', () => {
    it('debe encontrar chats donde el usuario es participante', async () => {
      // Arrange: Crear datos de prueba
      const userId = Uuid.generate();
      const otherUserId = Uuid.generate();
      const chatId1 = Uuid.generate();
      const chatId2 = Uuid.generate();
      const chatId3 = Uuid.generate();

      // Crear participantes
      const user = participantsEntityRepository.create({
        id: userId,
        name: 'Test User',
        isCommercial: true,
        isVisitor: false,
        isOnline: true,
        isViewing: false,
        isTyping: false,
        assignedAt: new Date(),
        lastSeenAt: new Date(),
      });

      const otherUser = participantsEntityRepository.create({
        id: otherUserId,
        name: 'Other User',
        isCommercial: false,
        isVisitor: true,
        isOnline: true,
        isViewing: false,
        isTyping: false,
        assignedAt: new Date(),
        lastSeenAt: new Date(),
      });

      await participantsEntityRepository.save([user, otherUser]);

      // Crear chats: el usuario participa en chat1 y chat2, pero no en chat3
      const chat1 = chatEntityRepository.create({
        id: chatId1,
        status: 'active',
        lastMessage: 'Test message 1',
        lastMessageAt: new Date(),
        createdAt: new Date(),
        participants: [user, otherUser],
      });

      const chat2 = chatEntityRepository.create({
        id: chatId2,
        status: 'active',
        lastMessage: 'Test message 2',
        lastMessageAt: new Date(),
        createdAt: new Date(),
        participants: [user],
      });

      const chat3 = chatEntityRepository.create({
        id: chatId3,
        status: 'active',
        lastMessage: 'Test message 3',
        lastMessageAt: new Date(),
        createdAt: new Date(),
        participants: [otherUser],
      });

      await chatEntityRepository.save([chat1, chat2, chat3]);

      // Act: Buscar chats donde el usuario es participante
      const criteria = new Criteria<Chat>().addFilter('participants', Operator.EQUALS, userId);
      const result = await chatRepository.find(criteria);

      // Assert: Debe encontrar solo los chats donde el usuario participa
      expect(result.chats).toHaveLength(2);
      const chatIds = result.chats.map(c => c.id);
      expect(chatIds).toContain(chatId1);
      expect(chatIds).toContain(chatId2);
      expect(chatIds).not.toContain(chatId3);
    });

    it('debe retornar array vacío cuando el usuario no participa en ningún chat', async () => {
      // Arrange: Crear un usuario que no participa en ningún chat
      const userId = Uuid.generate();
      const otherUserId = Uuid.generate();
      const chatId = Uuid.generate();

      // Crear participante que no está en ningún chat
      const user = participantsEntityRepository.create({
        id: userId,
        name: 'Isolated User',
        isCommercial: true,
        isVisitor: false,
        isOnline: true,
        isViewing: false,
        isTyping: false,
        assignedAt: new Date(),
        lastSeenAt: new Date(),
      });

      const otherUser = participantsEntityRepository.create({
        id: otherUserId,
        name: 'Other User',
        isCommercial: false,
        isVisitor: true,
        isOnline: true,
        isViewing: false,
        isTyping: false,
        assignedAt: new Date(),
        lastSeenAt: new Date(),
      });

      await participantsEntityRepository.save([user, otherUser]);

      // Crear chat solo con otro usuario
      const chat = chatEntityRepository.create({
        id: chatId,
        status: 'active',
        lastMessage: 'Test message',
        lastMessageAt: new Date(),
        createdAt: new Date(),
        participants: [otherUser],
      });

      await chatEntityRepository.save(chat);

      // Act: Buscar chats donde el usuario aislado es participante
      const criteria = new Criteria<Chat>().addFilter('participants', Operator.EQUALS, userId);
      const result = await chatRepository.find(criteria);

      // Assert: No debe encontrar ningún chat
      expect(result.chats).toHaveLength(0);
    });
  });
});
