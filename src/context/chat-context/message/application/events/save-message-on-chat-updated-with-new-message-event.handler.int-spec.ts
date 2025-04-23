import * as dotenv from 'dotenv';
dotenv.config();
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaveMessageOnChatUpdatedWithNewMessageEventHandler } from './save-message-on-chat-updated-with-new-message-event.handler';
import { TypeOrmMessageService } from '../../infrastructure/typeORM-message.service';
import { MESSAGE_REPOSITORY } from '../../domain/message.repository';
import { MessageEntity } from '../../infrastructure/entities/message.entity';
import { ChatUpdatedWithNewMessageEvent } from 'src/context/chat-context/chat/domain/chat/events/chat-updated-with-new-message.event';
import { UUID } from 'src/context/shared/domain/value-objects/uuid';

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
    // Cerramos la conexión de TypeORM
    await messageRepository['messageRepository'].manager.connection.destroy();
  });

  it('should save the message in the database when event is handled', async () => {
    // Generamos UUIDs válidos para los campos requeridos
    const messageId = UUID.generate();
    const chatId = UUID.generate();
    const senderId = UUID.generate();
    // Creamos un mensaje de prueba en formato primitivo
    const messagePrimitives = {
      id: messageId,
      chatId: chatId,
      senderId: senderId,
      content: 'Hello integration!',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Creamos el evento con el mensaje
    const event = {
      params: {
        attributes: {
          message: messagePrimitives,
        },
      },
    } as unknown as ChatUpdatedWithNewMessageEvent;

    // Ejecutamos el handler
    await handler.handle(event);

    // Buscamos el mensaje en la base de datos
    const found = await messageRepository['messageRepository'].findOne({
      where: { id: messagePrimitives.id },
    });

    // Verificamos que el mensaje fue guardado correctamente
    expect(found).toBeDefined(); // Nos aseguramos que found no sea null
    if (!found) throw new Error('Message not found in database');
    expect(found.id).toBe(messagePrimitives.id);
    expect(found.content).toBe(messagePrimitives.content);
  });
});
