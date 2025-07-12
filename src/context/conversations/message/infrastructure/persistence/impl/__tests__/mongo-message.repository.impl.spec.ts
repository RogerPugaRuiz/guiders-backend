import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { MongoMessageRepository } from '../mongo-message.repository.impl';
import {
  MessageMongooseEntity,
  MessageMongooseSchema,
} from '../../entity/message-mongoose.mongodb-entity';
import { Message } from '../../../../domain/message';
import { MessageId } from '../../../../domain/value-objects/message-id';
import { Content } from '../../../../domain/value-objects/content';
import { SenderId } from '../../../../domain/value-objects/sender-id';
import { ChatId } from '../../../../../chat/domain/chat/value-objects/chat-id';
import { CreatedAt } from '../../../../domain/value-objects/created-at';
import { ChatMessageEncryptorService } from '../../../../../chat/infrastructure/chat-message-encryptor.service';
import { CHAT_MESSAGE_ENCRYPTOR } from '../../../../../chat/application/services/chat-message-encryptor';
import {
  Criteria,
  Filter,
  Operator,
} from '../../../../../../shared/domain/criteria';
import { getModelToken } from '@nestjs/mongoose';
import { UuidValueObject } from '../../../../../../shared/domain/uuid-value-object';

/**
 * Test del repositorio MongoDB de mensajes
 * Verifica la funcionalidad de persistencia y mapeo
 */
describe('MongoMessageRepository', () => {
  let repository: MongoMessageRepository;
  let module: TestingModule;
  let mongoServer: MongoMemoryServer;
  let connection: Connection;

  beforeAll(async () => {
    // Configurar MongoDB en memoria para tests
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          {
            name: MessageMongooseEntity.name,
            schema: MessageMongooseSchema,
          },
        ]),
      ],
      providers: [
        MongoMessageRepository,
        {
          provide: CHAT_MESSAGE_ENCRYPTOR,
          useValue: {
            encrypt: jest.fn().mockResolvedValue('encrypted-content'),
            decrypt: jest.fn().mockResolvedValue('decrypted-content'),
          } as Partial<ChatMessageEncryptorService>,
        },
      ],
    }).compile();

    repository = module.get<MongoMessageRepository>(MongoMessageRepository);
    connection = module.get<Connection>(getConnectionToken());
  }, 20000); // Aumentar timeout a 20 segundos

  afterAll(async () => {
    if (connection) {
      await connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    // Limpiar la base de datos antes de cada test
    if (connection.db) {
      await connection.db.dropDatabase();
    }
  });

  describe('save', () => {
    it('debería guardar un mensaje correctamente', async () => {
      // Arrange
      const messageId = UuidValueObject.generate();
      const senderId = UuidValueObject.generate();
      const chatId = UuidValueObject.generate();

      const message = Message.create({
        id: MessageId.create(messageId),
        content: Content.create('Test message content'),
        senderId: SenderId.create(senderId),
        chatId: ChatId.create(chatId),
        createdAt: CreatedAt.create(new Date()),
      });

      // Act
      const result = await repository.save(message);

      // Assert
      expect(result.isOk()).toBe(true);

      // Verificar que el mensaje se guardó en la base de datos
      const model = module.get(getModelToken(MessageMongooseEntity.name));
      const savedEntity = await model.findOne({ id: messageId });

      expect(savedEntity).toBeDefined();
      expect(savedEntity.id).toBe(messageId);
      expect(savedEntity.content).toBe('encrypted-content');
      expect(savedEntity.sender).toBe(senderId);
      expect(savedEntity.chatId).toBe(chatId);
    });
  });

  describe('findOne', () => {
    it('debería encontrar un mensaje por criterios', async () => {
      // Arrange
      const messageId = UuidValueObject.generate();
      const senderId = UuidValueObject.generate();
      const chatId = UuidValueObject.generate();
      const model = module.get(getModelToken(MessageMongooseEntity.name));

      await model.create({
        id: messageId,
        content: 'encrypted-content',
        sender: senderId,
        chatId: chatId,
        timestamp: new Date(),
        isRead: false,
      });

      const criteria = new Criteria<Message>([
        new Filter('id', Operator.EQUALS, messageId),
      ]);

      // Act
      const result = await repository.findOne(criteria);

      // Assert
      expect(result.isEmpty()).toBe(false);
      const messageData = result.get();
      expect(messageData.message.id.value).toBe(messageId);
      expect(messageData.message.content.value).toBe('decrypted-content');
    });

    it('debería retornar Optional.empty() cuando no encuentra el mensaje', async () => {
      // Arrange
      const nonExistentId = UuidValueObject.generate();
      const criteria = new Criteria<Message>([
        new Filter('id', Operator.EQUALS, nonExistentId),
      ]);

      // Act
      const result = await repository.findOne(criteria);

      // Assert
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('find', () => {
    it('debería encontrar múltiples mensajes', async () => {
      // Arrange
      const model = module.get(getModelToken(MessageMongooseEntity.name));
      const chatId = UuidValueObject.generate();
      const senderId1 = UuidValueObject.generate();
      const senderId2 = UuidValueObject.generate();
      const messageId1 = UuidValueObject.generate();
      const messageId2 = UuidValueObject.generate();

      await model.create([
        {
          id: messageId1,
          content: 'encrypted-content-1',
          sender: senderId1,
          chatId,
          timestamp: new Date(),
          isRead: false,
        },
        {
          id: messageId2,
          content: 'encrypted-content-2',
          sender: senderId2,
          chatId,
          timestamp: new Date(),
          isRead: false,
        },
      ]);

      const criteria = new Criteria<Message>([
        new Filter('chatId', Operator.EQUALS, chatId),
      ]);

      // Act
      const result = await repository.find(criteria);

      // Assert
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].chatId.value).toBe(chatId);
      expect(result.messages[1].chatId.value).toBe(chatId);
    });
  });
});
