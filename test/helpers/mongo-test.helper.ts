import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';

/**
 * Helper para gestionar MongoDB Memory Server en tests E2E
 * Funciona tanto en desarrollo local como en CI/CD
 */
export class MongoTestHelper {
  private static mongoServer: MongoMemoryServer | null = null;

  /**
   * Inicia MongoDB Memory Server si estamos en CI, o usa configuración regular si es local
   */
  static async getMongooseModule(): Promise<any> {
    const isCI =
      process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

    if (isCI) {
      console.log('🔧 Configurando MongoDB Memory Server para CI...');

      // Configuración específica para CI
      const mongoServer = await MongoMemoryServer.create({
        binary: {
          version: '5.0.13',
          checkMD5: false,
        },
        instance: {
          dbName: 'guiders-test-e2e',
          port: undefined, // Puerto automático
        },
      });

      this.mongoServer = mongoServer;
      const uri = mongoServer.getUri();

      console.log(`✅ MongoDB Memory Server iniciado en CI: ${uri}`);

      const options: MongooseModuleOptions = {
        uri,
        connectTimeoutMS: 30000,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        maxPoolSize: 5,
        minPoolSize: 1,
      };

      return MongooseModule.forRoot(uri, options);
    } else {
      // Desarrollo local: usar configuración de variables de entorno estándar
      console.log('🔧 Usando configuración MongoDB local para E2E...');

      const mongoHost = process.env.TEST_MONGODB_HOST || 'localhost';
      const mongoPort = process.env.TEST_MONGODB_PORT || '27018';
      const mongoDatabase = process.env.TEST_MONGODB_DATABASE || 'guiders-test';
      const mongoUser = process.env.TEST_MONGODB_ROOT_USERNAME || 'admin_test';
      const mongoPassword =
        process.env.TEST_MONGODB_ROOT_PASSWORD || 'admin123';

      const uri = `mongodb://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPassword)}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=admin`;

      console.log(
        `✅ Conectando a MongoDB local: ${mongoHost}:${mongoPort}/${mongoDatabase}`,
      );

      const options: MongooseModuleOptions = {
        uri,
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 5,
      };

      return MongooseModule.forRoot(uri, options);
    }
  }

  /**
   * Detiene MongoDB Memory Server si está corriendo
   */
  static async cleanup(): Promise<void> {
    if (this.mongoServer) {
      console.log('🧹 Deteniendo MongoDB Memory Server...');
      await this.mongoServer.stop();
      this.mongoServer = null;
      console.log('✅ MongoDB Memory Server detenido');
    }
  }

  /**
   * Obtiene la URI de conexión actual
   */
  static getUri(): string | null {
    if (this.mongoServer) {
      return this.mongoServer.getUri();
    }
    return null;
  }
}
