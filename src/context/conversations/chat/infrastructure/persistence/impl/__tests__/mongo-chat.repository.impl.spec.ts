import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoChatRepository } from '../mongo-chat.repository.impl';
import { ChatMongooseEntity } from '../../entity/chat-mongoose.mongodb-entity';
import { Chat } from '../../../../domain/chat/chat';
import { ChatId } from '../../../../domain/chat/value-objects/chat-id';
import { Criteria, Filter, Operator } from 'src/context/shared/domain/criteria';
import { CHAT_MESSAGE_ENCRYPTOR } from '../../../../application/services/chat-message-encryptor';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('MongoChatRepository', () => {
  let repository: MongoChatRepository;
  let mockChatModel: jest.Mocked<Model<ChatMongooseEntity>>;
  let mockChatMessageEncryptor: jest.Mocked<any>;

  // UUIDs válidos para las pruebas
  const validChatId = Uuid.random().value;
  const validCompanyId = Uuid.random().value;
  const validUserId = Uuid.random().value;

  beforeEach(async () => {
    // Mock del modelo de Mongoose
    mockChatModel = {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(() => ({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        exec: jest.fn(),
      })),
    } as any;

    // Mock del encriptador de mensajes
    mockChatMessageEncryptor = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongoChatRepository,
        {
          provide: getModelToken(ChatMongooseEntity.name),
          useValue: mockChatModel,
        },
        {
          provide: CHAT_MESSAGE_ENCRYPTOR,
          useValue: mockChatMessageEncryptor,
        },
      ],
    }).compile();

    repository = module.get<MongoChatRepository>(MongoChatRepository);
  });

  describe('save', () => {
    it('debe guardar un chat correctamente', async () => {
      // Arrange
      const chat = Chat.fromPrimitives({
        id: validChatId,
        companyId: validCompanyId,
        status: 'PENDING',
        participants: [
          {
            id: validUserId,
            name: 'Usuario Test',
            isCommercial: false,
            isVisitor: true,
          },
        ],
        lastMessage: null,
        lastMessageAt: null,
        createdAt: new Date(),
      });

      mockChatMessageEncryptor.encrypt.mockResolvedValue('encrypted-message');
      mockChatModel.findOneAndUpdate.mockResolvedValue({} as any);

      // Act
      await repository.save(chat);

      // Assert
      expect(mockChatModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: validChatId },
        expect.objectContaining({
          id: validChatId,
          companyId: validCompanyId,
          status: 'PENDING',
          participants: expect.arrayContaining([
            expect.objectContaining({
              id: validUserId,
              name: 'Usuario Test',
              isCommercial: false,
              isVisitor: true,
            }),
          ]),
        }),
        { upsert: true, new: true },
      );
    });
  });

  describe('findById', () => {
    it('debe encontrar un chat por ID', async () => {
      // Arrange
      const chatId = ChatId.create(validChatId);
      const mockEntity = {
        id: validChatId,
        companyId: validCompanyId,
        status: 'PENDING',
        participants: [
          {
            id: validUserId,
            name: 'Usuario Test',
            isCommercial: false,
            isVisitor: true,
            isOnline: false,
            isViewing: false,
            isTyping: false,
            isAnonymous: true,
            assignedAt: new Date(),
          },
        ],
        lastMessage: null,
        lastMessageAt: null,
        createdAt: new Date(),
      };

      mockChatModel.findOne.mockResolvedValue(mockEntity as any);
      mockChatMessageEncryptor.decrypt.mockResolvedValue('decrypted-message');

      // Act
      const result = await repository.findById(chatId);

      // Assert
      expect(result.isPresent()).toBe(true);
      expect(result.get().chat.id.value).toBe(validChatId);
      expect(mockChatModel.findOne).toHaveBeenCalledWith({ id: validChatId });
    });

    it('debe retornar Optional.empty() cuando no se encuentra el chat', async () => {
      // Arrange
      const chatId = ChatId.create(validChatId);
      mockChatModel.findOne.mockResolvedValue(null);

      // Act
      const result = await repository.findById(chatId);

      // Assert
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('find', () => {
    it('debe encontrar chats con criterios', async () => {
      // Arrange
      const criteria = new Criteria<Chat>([
        new Filter<Chat>('companyId', Operator.EQUALS, validCompanyId),
      ]);

      const mockEntities = [
        {
          id: validChatId,
          companyId: validCompanyId,
          status: 'PENDING',
          participants: [
            {
              id: validUserId,
              name: 'Usuario 1',
              isCommercial: false,
              isVisitor: true,
              isOnline: false,
              isViewing: false,
              isTyping: false,
              isAnonymous: true,
              assignedAt: new Date(),
            },
          ],
          lastMessage: null,
          lastMessageAt: null,
          createdAt: new Date(),
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEntities),
      };

      mockChatModel.find.mockReturnValue(mockQuery as any);
      mockChatMessageEncryptor.decrypt.mockResolvedValue('decrypted-message');

      // Act
      const result = await repository.find(criteria);

      // Assert
      expect(result.chats).toHaveLength(1);
      expect(result.chats[0].id.value).toBe(validChatId);
      expect(mockChatModel.find).toHaveBeenCalledWith({
        companyId: validCompanyId,
      });
    });
  });
});
