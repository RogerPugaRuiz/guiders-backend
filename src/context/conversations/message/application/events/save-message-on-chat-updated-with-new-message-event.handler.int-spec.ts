import * as dotenv from 'dotenv';
dotenv.config();
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaveMessageOnChatUpdatedWithNewMessageEventHandler } from './save-message-on-chat-updated-with-new-message-event.handler';
import { TypeOrmMessageService } from '../../infrastructure/typeORM-message.service';
import { MESSAGE_REPOSITORY } from '../../domain/message.repository';
import { MessageEntity } from '../../infrastructure/entities/message.entity';
import { ChatUpdatedWithNewMessageEvent } from 'src/context/conversations/chat/domain/chat/events/chat-updated-with-new-message.event';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { CHAT_MESSAGE_ENCRYPTOR } from 'src/context/conversations/chat/application/services/chat-message-encryptor';
import { Criteria, Operator, Filter } from 'src/context/shared/domain/criteria';
import { Message } from '../../domain/message';

// Mock del ChatMessageEncryptor para las pruebas
const mockChatMessageEncryptor = {
  encrypt: jest
    .fn()
    .mockImplementation((message: string) =>
      Promise.resolve(`encrypted_${message}`),
    ),
  decrypt: jest
    .fn()
    .mockImplementation((encryptedMessage: string) =>
      Promise.resolve(encryptedMessage.replace('encrypted_', '')),
    ),
};

// Prueba de integración para SaveMessageOnChatUpdatedWithNewMessageEventHandler
// Verifica que el handler guarda correctamente el mensaje en la base de datos

describe('SaveMessageOnChatUpdatedWithNewMessageEventHandler (integration)', () => {
  let handler: SaveMessageOnChatUpdatedWithNewMessageEventHandler;
  let messageRepository: TypeOrmMessageService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DATABASE_HOST,
          port: Number(process.env.TEST_DATABASE_PORT),
          username: process.env.TEST_DATABASE_USERNAME,
          password: process.env.TEST_DATABASE_PASSWORD,
          database: process.env.TEST_DATABASE,
          dropSchema: true,
          entities: [MessageEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([MessageEntity]),
      ],
      providers: [
        SaveMessageOnChatUpdatedWithNewMessageEventHandler,
        {
          provide: MESSAGE_REPOSITORY,
          useClass: TypeOrmMessageService,
        },
        {
          provide: CHAT_MESSAGE_ENCRYPTOR,
          useValue: mockChatMessageEncryptor,
        },
      ],
    }).compile();

    handler = module.get(SaveMessageOnChatUpdatedWithNewMessageEventHandler);
    messageRepository = module.get<TypeOrmMessageService>(MESSAGE_REPOSITORY);
  });

  beforeEach(async () => {
    // Limpiamos la tabla de mensajes antes de cada prueba
    await messageRepository['messageRepository'].query(
      'TRUNCATE TABLE "messages" RESTART IDENTITY CASCADE;',
    );
  });

  afterAll(async () => {
    // Cerramos la conexión de TypeORM solo si messageRepository está disponible
    if (messageRepository && messageRepository['messageRepository']) {
      await messageRepository['messageRepository'].manager.connection.destroy();
    }
  });

  it('should save the message in the database when event is handled', async () => {
    // Generamos Uuids válidos para los campos requeridos
    const messageId = Uuid.generate();
    const chatId = Uuid.generate();
    const senderId = Uuid.generate();
    // Creamos un mensaje de prueba en formato primitivo
    const now = new Date();
    const messagePrimitives = {
      id: messageId,
      chatId: chatId,
      senderId: senderId,
      content: 'Hello integration!',
      createdAt: now,
      updatedAt: now,
    };
    // Creamos un chat de prueba con los campos mínimos requeridos
    const chatPrimitives = {
      id: chatId,
      companyId: 'test-company-id',
      participants: [
        {
          id: senderId,
          name: 'Test User',
          isCommercial: false,
          isVisitor: true,
          isOnline: true,
          assignedAt: now,
          lastSeenAt: now,
          isViewing: false,
          isTyping: false,
          isAnonymous: true,
        },
      ],
      status: 'active',
      lastMessage: null,
      lastMessageAt: null,
      createdAt: now,
    };
    // Creamos el evento usando la API real
    const event = new ChatUpdatedWithNewMessageEvent({
      message: messagePrimitives,
      chat: chatPrimitives,
    });

    // Ejecutamos el handler
    await handler.handle(event);

    // Buscamos el mensaje usando el repositorio del dominio (que automáticamente desencripta)
    const foundMessage = await messageRepository.findOne(
      new Criteria<Message>([
        new Filter<Message>('id', Operator.EQUALS, messagePrimitives.id),
      ]),
    );

    // Verificamos que el mensaje fue guardado correctamente
    expect(foundMessage.isPresent()).toBe(true);
    const message = foundMessage.get().message;
    expect(message.id.value).toBe(messagePrimitives.id);
    expect(message.content.value).toBe(messagePrimitives.content);
  });
});
