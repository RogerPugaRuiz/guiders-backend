import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ChatSchemaDefinition } from '../../schemas/chat.schema';
import { MessageSchemaDefinition } from '../../schemas/message.schema';
import { ChatMapper } from '../../mappers/chat.mapper';
import { MessageMapper } from '../../mappers/message.mapper';
import { MongoChatRepositoryImpl } from '../impl/mongo-chat.repository.impl';
import { MongoMessageRepositoryImpl } from '../impl/mongo-message.repository.impl';

describe('MongoDB Integration - Conversations V2 Infrastructure', () => {
  let mongoServer: MongoMemoryServer | null = null;
  let connection: mongoose.Connection | null = null;
  let chatRepository: MongoChatRepositoryImpl;
  let messageRepository: MongoMessageRepositoryImpl;
  let chatModel: Model<any>;
  let messageModel: Model<any>;
  let chatMapper: ChatMapper;
  let messageMapper: MessageMapper;

  const isCI =
    process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

  const getMongoConfig = async (): Promise<string> => {
    if (isCI) {
      const mongoUri =
        process.env.MONGODB_URL ||
        'mongodb://admin_test:test_password@localhost:27017/guiders_test?authSource=admin';
      console.log(
        `🔗 Usando MongoDB del servicio CI: ${mongoUri.replace(
          /\/\/[^:]+:[^@]+@/,
          '//***:***@',
        )}`,
      );
      return mongoUri;
    } else {
      console.log(`🧪 Configurando MongoDB Memory Server...`);
      const mongoOptions = {
        binary: {
          version: '6.0.1',
          skipMD5: true,
        },
        instance: {
          dbName: 'guiders_test_integration',
        },
      };

      mongoServer = await MongoMemoryServer.create(mongoOptions);
      const uri = mongoServer.getUri();
      console.log(`✅ MongoDB Memory Server iniciado en: ${uri}`);
      return uri;
    }
  };

  beforeAll(async () => {
    try {
      console.log(`🚀 Configurando entorno de tests...`);
      const uri = await getMongoConfig();

      // Conectar a MongoDB
      console.log(`📡 Conectando a MongoDB...`);
      connection = await mongoose.createConnection(uri).asPromise();
      console.log(`✅ Conexión establecida a MongoDB`);

      // Registrar esquemas
      chatModel = connection.model('Chat', ChatSchemaDefinition);
      messageModel = connection.model('Message', MessageSchemaDefinition);

      // Crear mappers
      chatMapper = new ChatMapper();
      messageMapper = new MessageMapper();

      // Inicializar repositorios
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      chatRepository = new MongoChatRepositoryImpl(chatModel, chatMapper);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      messageRepository = new MongoMessageRepositoryImpl(
        messageModel,
        messageMapper,
      );
      console.log(`🎯 Repositorios inicializados correctamente`);
    } catch (error) {
      console.error('❌ Error en setup de tests:', error);
      throw error;
    }
  }, 180000); // 3 minutos timeout

  afterAll(async () => {
    try {
      console.log(`🧹 Cerrando conexiones...`);

      if (connection) {
        await connection.close();
        console.log(`✅ Conexión MongoDB cerrada`);
      }

      if (mongoServer) {
        await mongoServer.stop();
        console.log(`✅ MongoDB Memory Server detenido`);
      }
    } catch (error) {
      console.error('⚠️ Error cerrando conexiones:', error);
    }
  });

  beforeEach(async () => {
    if (connection) {
      // Limpiar colecciones antes de cada test
      const collections = await connection?.db?.collections();
      if (collections) {
        for (const collection of collections) {
          await collection.deleteMany({});
        }
      }
    }
  });

  it('debería conectar a MongoDB y crear repositorios', () => {
    expect(chatRepository).toBeDefined();
    expect(messageRepository).toBeDefined();
    expect(chatModel).toBeDefined();
    expect(messageModel).toBeDefined();
  });
});
