import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';

/**
 * Helper para gestionar MongoDB Memory Server en tests E2E
 * Funciona tanto en desarrollo local como en CI/CD
 */
export class MongoTestHelper {
  private static mongoServer: MongoMemoryServer | null = null;

  /**
   * Configura MongoDB para tests E2E - usa servicio real tanto en CI como localmente
   */
  static getMongooseModule(): any {
    const isCI =
      process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

    if (isCI) {
      console.log('🔧 Configurando MongoDB para CI (servicio real)...');

      // En CI usamos el servicio MongoDB real configurado en GitHub Actions
      const mongoHost = process.env.TEST_MONGODB_HOST || 'localhost';
      const mongoPort = process.env.TEST_MONGODB_PORT || '27017';
      const mongoDatabase =
        process.env.TEST_MONGODB_DATABASE || 'guiders-test-e2e';
      const mongoUser = process.env.TEST_MONGODB_ROOT_USERNAME || 'admin_test';
      const mongoPassword =
        process.env.TEST_MONGODB_ROOT_PASSWORD || 'admin123';

      const uri = `mongodb://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPassword)}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=admin`;

      console.log(
        `✅ Conectando a MongoDB en CI: ${mongoHost}:${mongoPort}/${mongoDatabase}`,
      );

      const options: MongooseModuleOptions = {
        uri,
        connectTimeoutMS: 30000,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
        retryReads: true,
      };

      return MongooseModule.forRoot(uri, options);
    } else {
      // Desarrollo local: usar configuración de variables de entorno estándar
      console.log('🔧 Usando configuración MongoDB local para E2E...');

      const mongoHost = process.env.TEST_MONGODB_HOST || 'localhost';
      const mongoPort = process.env.TEST_MONGODB_PORT || '27017';
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
   * Cleanup - solo relevante si se usa Memory Server en desarrollo local
   */
  static async cleanup(): Promise<void> {
    if (this.mongoServer) {
      console.log('🧹 Deteniendo MongoDB Memory Server...');
      await this.mongoServer.stop();
      this.mongoServer = null;
      console.log('✅ MongoDB Memory Server detenido');
    } else {
      console.log('✅ No hay MongoDB Memory Server para limpiar');
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
