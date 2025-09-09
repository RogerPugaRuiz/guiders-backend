import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  ChatSchema,
  ChatSchemaDefinition,
  ChatDocument,
} from '../../schemas/chat.schema';
import {
  MessageSchema,
  MessageSchemaDefinition,
  MessageDocument,
} from '../../schemas/message.schema';
import { ChatMapper } from '../../mappers/chat.mapper';
import { MessageMapper } from '../../mappers/message.mapper';
import { MongoChatRepositoryImpl } from '../impl/mongo-chat.repository.impl';
import { MongoMessageRepositoryImpl } from '../impl/mongo-message.repository.simple';
import { Chat } from '../../../domain/entities/chat';
import { Message } from '../../../domain/entities/message';
import { ChatId } from '../../../domain/value-objects/chat-id';
import { MessageId } from '../../../domain/value-objects/message-id';
import { VisitorId } from '../../../domain/value-objects/visitor-id';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { DockerMongoHelper } from './docker-mongo-helper';

describe('MongoDB Integration - Conversations V2 Infrastructure', () => {
  let mongoServer: MongoMemoryServer | null = null;
  let dockerMongo: DockerMongoHelper | null = null;
  let module: TestingModule;
  let chatRepository: MongoChatRepositoryImpl;
  let messageRepository: MongoMessageRepositoryImpl;
  let chatModel: Model<ChatDocument>;
  let messageModel: Model<MessageDocument>;
  let mongoUri: string;

  beforeAll(async () => {
    // Configurar MongoDB en memoria con timeout extendido
    const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';
    
    // Intentar primero con MongoDB Memory Server, luego Docker como fallback
    let mongoMemoryServerWorked = false;
    
    // Configuración más simple con fallbacks conservadores
    const mongoConfigs = [
      // Configuración básica con versión más estable
      {
        binary: {
          version: '4.4.25',
          skipMD5: true,
        },
        instance: {
          dbName: 'conversations-test',
        },
        autoStart: true,
      },
      // Configuración con versión aún más antigua pero muy estable
      {
        binary: {
          version: '4.2.24',
          skipMD5: true,
        },
        instance: {
          dbName: 'conversations-test',
        },
        autoStart: true,
      },
    ];

    let lastError: Error | null = null;
    
    // Intentar con MongoDB Memory Server
    console.log('🔧 Intentando iniciar con MongoDB Memory Server...');
    for (let i = 0; i < mongoConfigs.length; i++) {
      const config = mongoConfigs[i];
      try {
        console.log(`🔧 Intento ${i + 1}: Iniciando MongoDB Memory Server con versión ${config.binary.version} (CI: ${isCI})...`);
        mongoServer = await MongoMemoryServer.create(config);
        mongoUri = mongoServer.getUri();
        console.log(`✅ MongoDB Memory Server iniciado exitosamente con versión ${config.binary.version}`);
        mongoMemoryServerWorked = true;
        break; // Si llegamos aquí, fue exitoso
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `⚠️ Intento ${i + 1} falló con versión ${config.binary.version}:`,
          lastError.message.slice(0, 100) + (lastError.message.length > 100 ? '...' : '')
        );
        
        // Si no es el último intento, continuar al siguiente
        if (i < mongoConfigs.length - 1) {
          console.log(`🔄 Intentando con configuración de respaldo...`);
          continue;
        }
      }
    }

    // Si MongoDB Memory Server no funcionó, intentar con Docker
    if (!mongoMemoryServerWorked) {
      console.log('🐳 MongoDB Memory Server falló, intentando con Docker...');
      try {
        dockerMongo = new DockerMongoHelper(27017);
        mongoUri = await dockerMongo.start();
        console.log('✅ MongoDB Docker iniciado exitosamente como fallback');
      } catch (dockerError) {
        throw new Error(
          `❌ No se pudo iniciar MongoDB con ningún método. ` +
          `Memory Server error: ${lastError?.message?.slice(0, 100) || 'Error desconocido'}. ` +
          `Docker error: ${dockerError instanceof Error ? dockerError.message.slice(0, 100) : 'Error desconocido'}`
        );
      }
    }

    console.log(`🔗 MongoDB URI: ${mongoUri}`);

    // Crear módulo de testing
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: ChatSchema.name, schema: ChatSchemaDefinition },
          { name: MessageSchema.name, schema: MessageSchemaDefinition },
        ]),
      ],
      providers: [
        ChatMapper,
        MessageMapper,
        MongoChatRepositoryImpl,
        MongoMessageRepositoryImpl,
      ],
    }).compile();

    // Obtener instancias
    chatRepository = module.get<MongoChatRepositoryImpl>(
      MongoChatRepositoryImpl,
    );
    messageRepository = module.get<MongoMessageRepositoryImpl>(
      MongoMessageRepositoryImpl,
    );
    chatModel = module.get<Model<ChatDocument>>(getModelToken(ChatSchema.name));
    messageModel = module.get<Model<MessageDocument>>(
      getModelToken(MessageSchema.name),
    );
    
    console.log('🎯 Módulo de testing inicializado correctamente');
  }, 240000);

  afterAll(async () => {
    if (module) {
      await module.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    if (dockerMongo) {
      await dockerMongo.stop();
    }
  });

  beforeEach(async () => {
    // Limpiar bases de datos antes de cada test
    await chatModel.deleteMany({});
    await messageModel.deleteMany({});
  });

  describe('Configuración y Conectividad', () => {
    it('debería conectar correctamente a MongoDB', () => {
      expect(chatRepository).toBeDefined();
      expect(messageRepository).toBeDefined();
      expect(chatModel).toBeDefined();
      expect(messageModel).toBeDefined();
    });

    it('debería tener las colecciones disponibles', async () => {
      const chatCount = await chatModel.countDocuments();
      const messageCount = await messageModel.countDocuments();

      expect(chatCount).toBe(0);
      expect(messageCount).toBe(0);
    });
  });

  describe('Integración Chat Repository - MongoDB', () => {
    it('debería guardar un chat completo en MongoDB', async () => {
      // Arrange - Crear datos del chat
      const chatId = ChatId.create();
      const visitorId = VisitorId.create(Uuid.random().value);
      const commercialId1 = Uuid.random().value;
      const commercialId2 = Uuid.random().value;

      const chat = Chat.fromPrimitives({
        id: chatId.value,
        status: 'PENDING',
        priority: 'HIGH',
        visitorId: visitorId.value,
        availableCommercialIds: [commercialId1, commercialId2],
        visitorInfo: {
          name: 'Juan Pérez',
          email: 'juan@example.com',
          phone: '+34600000000',
          location: {
            country: 'España',
            city: 'Barcelona',
          },
          company: 'ABC Corp',
        },
        metadata: {
          department: 'Ventas',
          source: 'web',
          tags: ['priority', 'high'],
          customFields: { campaign: 'summer2024' },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        totalMessages: 0,
      });

      // Act - Guardar usando el repositorio
      const saveResult = await chatRepository.save(chat);

      // Assert - Verificar guardado exitoso
      expect(saveResult.isOk()).toBe(true);

      // Verificar que se guardó correctamente en MongoDB
      const savedDoc = await chatModel.findOne({
        id: chatId.value,
      });
      expect(savedDoc).toBeDefined();
      expect(savedDoc?.status).toBe('PENDING');
      expect(savedDoc?.priority).toBe('HIGH');
      expect(savedDoc?.visitorInfo.name).toBe('Juan Pérez');
      expect(savedDoc?.metadata.department).toBe('Ventas');
      expect(savedDoc?.isActive).toBe(true);
    });

    it('debería recuperar un chat por ID usando el repositorio', async () => {
      // Arrange - Insertar directamente en MongoDB
      const testChatId = Uuid.random().value;
      const testVisitorId = Uuid.random().value;
      const testCommercialId = Uuid.random().value;

      await chatModel.create({
        id: testChatId,
        status: 'ASSIGNED',
        priority: 'NORMAL',
        visitorId: testVisitorId,
        assignedCommercialId: testCommercialId,
        availableCommercialIds: [testCommercialId],
        visitorInfo: {
          id: testVisitorId,
          name: 'María García',
          email: 'maria@example.com',
          phone: '+34600000000',
          location: 'Madrid, España',
          additionalData: {
            company: 'Cliente Test',
          },
        },
        metadata: {
          department: 'soporte',
          source: 'phone',
        },
        department: 'soporte',
        totalMessages: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act - Recuperar usando el repositorio
      const foundResult = await chatRepository.findById(
        ChatId.create(testChatId),
      );

      // Debug - Ver qué está pasando
      if (foundResult.isErr()) {
        console.log('Error en findById:', foundResult.error.message);
      }

      // Assert - Verificar que se recuperó correctamente
      expect(foundResult.isOk()).toBe(true);
      const foundChat = foundResult.unwrap();
      expect(foundChat.id.value).toBe(testChatId);
      expect(foundChat.status.value).toBe('ASSIGNED');
      expect(foundChat.assignedCommercialId.isPresent()).toBe(true);
      expect(foundChat.assignedCommercialId.get().value).toBe(testCommercialId);
    });
  });

  describe('Integración Message Repository - MongoDB', () => {
    let testChatId: string;

    beforeEach(async () => {
      // Crear un chat de prueba para cada test de mensajes
      testChatId = Uuid.random().value;
      const testVisitorId = Uuid.random().value;
      const testCommercialId = Uuid.random().value;
      await chatModel.create({
        id: testChatId,
        status: 'ASSIGNED',
        priority: 'NORMAL',
        visitorId: Uuid.random().value,
        assignedCommercialId: testCommercialId,
        availableCommercialIds: [testCommercialId],
        visitorInfo: {
          id: testVisitorId,
          name: 'Test User',
          email: 'test@example.com',
          additionalData: {},
        },
        metadata: {
          department: 'test',
          source: 'website',
        },
        department: 'test',
        totalMessages: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('debería guardar un mensaje en MongoDB', async () => {
      // Arrange - Crear mensaje de dominio
      const senderId = Uuid.random().value;

      const message = Message.createTextMessage({
        chatId: testChatId,
        senderId,
        content: 'Hola, necesito ayuda con mi pedido',
        isInternal: false,
        isFirstResponse: true,
      });

      // Act - Guardar mensaje
      const saveResult = await messageRepository.save(message);

      // Debug - Ver qué está pasando
      if (saveResult.isErr()) {
        console.log('Error en save message:', saveResult.error.message);
      }

      // Assert - Verificar guardado exitoso
      expect(saveResult.isOk()).toBe(true);

      // Verificar en MongoDB
      const savedMessage = await messageModel.findOne({
        chatId: testChatId,
      });
      expect(savedMessage).toBeDefined();
      expect(savedMessage?.content.text).toBe(
        'Hola, necesito ayuda con mi pedido',
      );
    });

    it('debería recuperar mensajes por chat ID', async () => {
      // Arrange - Crear varios mensajes usando el repositorio
      const messageCount = 5;
      for (let i = 1; i <= messageCount; i++) {
        const message = Message.createTextMessage({
          chatId: testChatId,
          senderId: 'test-sender',
          content: `Mensaje número ${i}`,
          isInternal: false,
          isFirstResponse: i === 1,
        });

        await messageRepository.save(message);
      }

      // Act - Recuperar mensajes por chat
      const result = await messageRepository.findByChatId(
        ChatId.create(testChatId),
        undefined,
        undefined,
        10,
        0,
      );

      // Assert - Verificar recuperación
      expect(result.isOk()).toBe(true);
      const searchResult = result.unwrap();
      expect(searchResult.messages).toHaveLength(messageCount);
      expect(searchResult.total).toBe(messageCount);
    });

    it('debería obtener el último mensaje de un chat', async () => {
      // Arrange - Crear varios mensajes
      for (let i = 1; i <= 3; i++) {
        const message = Message.createTextMessage({
          chatId: testChatId,
          senderId: 'test-sender',
          content: `Mensaje ${i}`,
          isInternal: false,
          isFirstResponse: i === 1,
        });

        await messageRepository.save(message);
        // Pequeña pausa para asegurar orden
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Act - Obtener último mensaje
      const lastMessageResult = await messageRepository.getLastMessage(
        ChatId.create(testChatId),
      );

      // Assert - Verificar que es el último
      expect(lastMessageResult.isOk()).toBe(true);
      expect(lastMessageResult.unwrap().toPrimitives().content).toBe(
        'Mensaje 3',
      );
    });
  });

  describe('Gestión de Errores', () => {
    it('debería manejar búsquedas de entidades inexistentes', async () => {
      // Chat inexistente
      const result = await chatRepository.findById(
        ChatId.create(Uuid.random().value),
      );
      expect(result.isErr()).toBe(true);

      // Mensaje inexistente
      const msgResult = await messageRepository.findById(
        MessageId.create(Uuid.random().value),
      );
      expect(msgResult.isErr()).toBe(true);
    });
  });

  describe('Performance Básica', () => {
    it('debería manejar múltiples chats', async () => {
      // Arrange - Crear múltiples chats
      const chatCount = 10;
      const chatIds: string[] = [];

      for (let i = 0; i < chatCount; i++) {
        const chatId = ChatId.generate();
        chatIds.push(chatId.value);
        const commercialId = Uuid.random().value;

        const chat = Chat.fromPrimitives({
          id: chatId.value,
          status: 'PENDING',
          priority: 'NORMAL',
          visitorId: VisitorId.create(Uuid.random().value).value,
          availableCommercialIds: [commercialId],
          visitorInfo: {
            name: `Usuario Test ${i}`,
            email: `test${i}@example.com`,
          },
          metadata: {
            department: 'ventas',
            source: 'website',
          },
          totalMessages: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await chatRepository.save(chat);
      }

      // Act - Verificar que todos se guardaron
      const totalChats = await chatModel.countDocuments();

      // Assert - Verificar resultados
      expect(totalChats).toBe(chatCount);

      // Verificar que podemos recuperar cada uno
      for (const chatId of chatIds) {
        const result = await chatRepository.findById(ChatId.create(chatId));
        expect(result.isOk()).toBe(true);
      }
    });
  });
});
