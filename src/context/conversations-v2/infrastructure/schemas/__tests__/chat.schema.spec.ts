import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ChatSchema, ChatSchemaDefinition } from '../chat.schema';
import { DockerMongoHelper } from '../../persistence/__tests__/docker-mongo-helper';
// Aumentar timeout global para evitar fallos intermitentes al iniciar MongoMemoryServer
jest.setTimeout(180000);
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('ChatSchema (MongoDB Integration)', () => {
  let mongoServer: MongoMemoryServer | null = null;
  let dockerMongo: DockerMongoHelper | null = null;
  let chatModel: Model<ChatSchema>;
  let module: TestingModule;
  let mongoUri: string;

  beforeAll(async () => {
    // Intentar primero con MongoDB Memory Server, luego Docker como fallback
    let mongoMemoryServerWorked = false;
    
    // Configuración simple para este test de schema
    const mongoConfig = {
      binary: {
        version: '4.4.25',
        skipMD5: true,
      },
      instance: {
        dbName: 'chat-schema-test',
      },
      autoStart: true,
    };

    // Intentar con MongoDB Memory Server
    try {
      console.log('🔧 Intentando iniciar con MongoDB Memory Server...');
      mongoServer = await MongoMemoryServer.create(mongoConfig);
      mongoUri = mongoServer.getUri();
      console.log('✅ MongoDB Memory Server iniciado exitosamente');
      mongoMemoryServerWorked = true;
    } catch (error) {
      console.warn('⚠️ MongoDB Memory Server falló:', error instanceof Error ? error.message.slice(0, 100) : 'Error desconocido');
    }

    // Si MongoDB Memory Server no funcionó, intentar con Docker
    if (!mongoMemoryServerWorked) {
      console.log('🐳 MongoDB Memory Server falló, intentando con Docker...');
      try {
        dockerMongo = new DockerMongoHelper(27018); // Usar puerto diferente para evitar conflictos
        mongoUri = await dockerMongo.start();
        console.log('✅ MongoDB Docker iniciado exitosamente como fallback');
      } catch (dockerError) {
        throw new Error(
          `❌ No se pudo iniciar MongoDB con ningún método para test de schema. ` +
          `Docker error: ${dockerError instanceof Error ? dockerError.message.slice(0, 100) : 'Error desconocido'}`
        );
      }
    }

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri, {
          connectTimeoutMS: 10000,
          serverSelectionTimeoutMS: 10000,
        }),
        MongooseModule.forFeature([
          { name: 'Chat', schema: ChatSchemaDefinition },
        ]),
      ],
    }).compile();

    chatModel = module.get<Model<ChatSchema>>(getModelToken('Chat'));
  }, 120000); // Aumentar timeout

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
  }, 10000); // Timeout para cleanup

  beforeEach(async () => {
    // Limpiar la colección antes de cada test
    if (chatModel) {
      await chatModel.deleteMany({});
    }
  });

  afterEach(async () => {
    if (chatModel) {
      await chatModel.deleteMany({});
    }
  });

  const createValidChatDocument = (): Partial<ChatSchema> => ({
    id: Uuid.random().value,
    visitorId: Uuid.random().value,
    status: 'PENDING',
    priority: 'NORMAL',
    department: 'ventas',
    visitorInfo: {
      id: Uuid.random().value,
      name: 'Usuario Test',
      email: 'test@example.com',
      phone: '+1234567890',
      location: 'Ciudad Test',
      additionalData: {
        company: 'Test Company',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test',
        referrer: 'https://test.com',
      },
    },
    metadata: {
      department: 'ventas',
      source: 'website',
      initialUrl: 'https://test.com/landing',
      userAgent: 'Mozilla/5.0 Test',
      referrer: 'https://google.com',
      tags: { utm_source: 'google' },
      customFields: { campaign: 'summer2024' },
    },
    totalMessages: 0,
    unreadMessagesCount: 0,
    isActive: true,
    tags: ['test', 'automated'],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('Creación de documentos', () => {
    it('debería crear un chat con datos válidos', async () => {
      // Arrange
      const chatData = createValidChatDocument();

      // Act
      const savedChat = await chatModel.create(chatData);

      // Assert
      expect(savedChat).toBeDefined();
      expect(savedChat.id).toBe(chatData.id);
      expect(savedChat.status).toBe('PENDING');
      expect(savedChat.priority).toBe('NORMAL');
      expect(savedChat.visitorInfo.name).toBe('Usuario Test');
      expect(savedChat.metadata.department).toBe('ventas');
      expect(savedChat.isActive).toBe(true);
      expect(savedChat.createdAt).toBeDefined();
      expect(savedChat.updatedAt).toBeDefined();
    });

    it('debería crear un chat asignado con comercial', async () => {
      // Arrange
      const chatData = createValidChatDocument();
      chatData.status = 'ASSIGNED';
      chatData.assignedCommercialId = Uuid.random().value;
      chatData.assignedAt = new Date();
      chatData.totalMessages = 5;

      // Act
      const savedChat = await chatModel.create(chatData);

      // Assert
      expect(savedChat.status).toBe('ASSIGNED');
      expect(savedChat.assignedCommercialId).toBeDefined();
      expect(savedChat.assignedAt).toBeDefined();
      expect(savedChat.totalMessages).toBe(5);
    });

    it('debería crear un chat cerrado', async () => {
      // Arrange
      const chatData = createValidChatDocument();
      chatData.status = 'CLOSED';
      chatData.assignedCommercialId = Uuid.random().value;
      chatData.assignedAt = new Date();
      chatData.closedAt = new Date();
      chatData.isActive = false;
      chatData.resolutionStatus = 'resolved';

      // Act
      const savedChat = await chatModel.create(chatData);

      // Assert
      expect(savedChat.status).toBe('CLOSED');
      expect(savedChat.closedAt).toBeDefined();
      expect(savedChat.isActive).toBe(false);
      expect(savedChat.resolutionStatus).toBe('resolved');
    });
  });

  describe('Validaciones de esquema', () => {
    it('debería fallar si falta el campo id requerido', async () => {
      // Arrange
      const chatData = createValidChatDocument();
      delete chatData.id;

      // Act & Assert
      await expect(chatModel.create(chatData)).rejects.toThrow();
    });

    it('debería fallar si falta el campo visitorId requerido', async () => {
      // Arrange
      const chatData = createValidChatDocument();
      delete chatData.visitorId;

      // Act & Assert
      await expect(chatModel.create(chatData)).rejects.toThrow();
    });

    it('debería fallar con status inválido', async () => {
      // Arrange
      const chatData = createValidChatDocument();
      (chatData as any).status = 'invalid_status';

      // Act & Assert
      await expect(chatModel.create(chatData)).rejects.toThrow();
    });

    it('debería fallar con priority inválida', async () => {
      // Arrange
      const chatData = createValidChatDocument();
      (chatData as any).priority = 'INVALID_PRIORITY';

      // Act & Assert
      await expect(chatModel.create(chatData)).rejects.toThrow();
    });

    it('debería fallar si visitorInfo.id es inválido', async () => {
      // Arrange
      const chatData = createValidChatDocument();
      (chatData.visitorInfo as any).id = null;

      // Act & Assert
      await expect(chatModel.create(chatData)).rejects.toThrow();
    });
  });

  describe('Índices y consultas', () => {
    beforeEach(async () => {
      // Crear varios chats de prueba
      const chatData1 = createValidChatDocument();
      chatData1.status = 'PENDING';
      await chatModel.create(chatData1);

      const chatData2 = createValidChatDocument();
      chatData2.status = 'ASSIGNED';
      chatData2.assignedCommercialId = 'commercial-123';
      await chatModel.create(chatData2);

      const chatData3 = createValidChatDocument();
      chatData3.status = 'CLOSED';
      chatData3.isActive = false;
      await chatModel.create(chatData3);
    });

    it('debería encontrar chats por status', async () => {
      // Act
      const pendingChats = await chatModel.find({ status: 'PENDING' });
      const assignedChats = await chatModel.find({ status: 'ASSIGNED' });
      const closedChats = await chatModel.find({ status: 'CLOSED' });

      // Assert
      expect(pendingChats).toHaveLength(1);
      expect(assignedChats).toHaveLength(1);
      expect(closedChats).toHaveLength(1);
    });

    it('debería encontrar chats por comercial asignado', async () => {
      // Act
      const commercialChats = await chatModel.find({
        assignedCommercialId: 'commercial-123',
      });

      // Assert
      expect(commercialChats).toHaveLength(1);
      expect(commercialChats[0].status).toBe('ASSIGNED');
    });

    it('debería encontrar chats activos', async () => {
      // Act
      const activeChats = await chatModel.find({ isActive: true });

      // Assert
      expect(activeChats).toHaveLength(2); // PENDING y ASSIGNED
    });

    it('debería ordenar chats por fecha de creación', async () => {
      // Act
      const chats = await chatModel.find({}).sort({ createdAt: -1 });

      // Assert
      expect(chats).toHaveLength(3);
      // Los chats deberían estar ordenados del más reciente al más antiguo
      for (let i = 0; i < chats.length - 1; i++) {
        expect(chats[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          chats[i + 1].createdAt.getTime(),
        );
      }
    });
  });

  describe('Pre-hooks y middleware', () => {
    it('debería actualizar updatedAt automáticamente en modificaciones', async () => {
      // Arrange
      const chatData = createValidChatDocument();
      const savedChat = await chatModel.create(chatData);
      const originalUpdatedAt = savedChat.updatedAt;

      // Esperar un poco para asegurar diferencia de tiempo
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      savedChat.totalMessages = 10;
      await savedChat.save();

      // Assert
      expect(savedChat.updatedAt).toBeDefined();
      expect(originalUpdatedAt).toBeDefined();
      if (savedChat.updatedAt && originalUpdatedAt) {
        expect(savedChat.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime(),
        );
      }
    });

    it('debería marcar isActive como false cuando se establece closedAt', async () => {
      // Arrange
      const chatData = createValidChatDocument();
      const savedChat = await chatModel.create(chatData);
      expect(savedChat.isActive).toBe(true);

      // Act
      savedChat.closedAt = new Date();
      await savedChat.save();

      // Assert
      expect(savedChat.isActive).toBe(false);
    });
  });

  describe('Transformaciones de salida', () => {
    it('debería transformar _id a id en toJSON', async () => {
      // Arrange
      const chatData = createValidChatDocument();
      const savedChat = await chatModel.create(chatData);

      // Act
      const jsonOutput = savedChat.toJSON();

      // Assert
      expect(jsonOutput.id).toBeDefined();
      expect(jsonOutput._id).toBeUndefined();
      expect(jsonOutput.__v).toBeUndefined();
    });
  });

  describe('Consultas complejas con filtros', () => {
    beforeEach(async () => {
      const baseData = createValidChatDocument();

      // Chat de alta prioridad activo
      const highPriorityChat = { ...baseData };
      highPriorityChat.id = Uuid.random().value;
      highPriorityChat.priority = 'HIGH';
      highPriorityChat.status = 'PENDING';
      if (highPriorityChat.metadata) {
        highPriorityChat.metadata.department = 'soporte';
      }
      highPriorityChat.department = 'soporte';
      await chatModel.create(highPriorityChat);

      // Chat de prioridad normal asignado
      const normalPriorityChat = { ...baseData };
      normalPriorityChat.id = Uuid.random().value;
      normalPriorityChat.priority = 'NORMAL';
      normalPriorityChat.status = 'ASSIGNED';
      normalPriorityChat.assignedCommercialId = 'commercial-456';
      normalPriorityChat.department = 'ventas';
      if (normalPriorityChat.metadata) {
        normalPriorityChat.metadata.department = 'ventas';
      }
      await chatModel.create(normalPriorityChat);

      // Chat cerrado
      const closedChat = { ...baseData };
      closedChat.id = Uuid.random().value;
      closedChat.status = 'CLOSED';
      closedChat.isActive = false;
      closedChat.closedAt = new Date();
      closedChat.department = 'marketing';
      if (closedChat.metadata) {
        closedChat.metadata.department = 'marketing';
      }
      await chatModel.create(closedChat);
    });

    it('debería filtrar por múltiples criterios', async () => {
      // Act
      const highPriorityActiveChats = await chatModel.find({
        priority: 'HIGH',
        isActive: true,
      });

      // Assert
      expect(highPriorityActiveChats).toHaveLength(1);
      expect(highPriorityActiveChats[0].priority).toBe('HIGH');
      expect(highPriorityActiveChats[0].status).toBe('PENDING');
    });

    it('debería buscar por departamento en metadata', async () => {
      // Act
      const supportChats = await chatModel.find({
        department: 'soporte',
      });

      // Assert
      expect(supportChats).toHaveLength(1);
      expect(supportChats[0].department).toBe('soporte');
    });

    it('debería contar chats por status', async () => {
      // Act
      const statusCounts = await chatModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      // Assert
      expect(statusCounts).toHaveLength(3);
      const statusCountMap = Object.fromEntries(
        statusCounts.map((item) => [item._id, item.count]),
      );
      expect(statusCountMap.PENDING).toBe(1);
      expect(statusCountMap.ASSIGNED).toBe(1);
      expect(statusCountMap.CLOSED).toBe(1);
    });
  });
});
