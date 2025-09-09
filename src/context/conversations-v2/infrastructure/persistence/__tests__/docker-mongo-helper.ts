/**
 * Helper para usar MongoDB con Docker en tests de integración
 * Alternativa a MongoDB Memory Server cuando no se pueden descargar binarios
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DockerMongoHelper {
  private containerName = 'test-mongo-guiders';
  private port = 27017;
  private dbName = 'conversations-test';

  constructor(port = 27017) {
    this.port = port;
    this.containerName = `test-mongo-guiders-${port}`;
  }

  async start(): Promise<string> {
    try {
      // Verificar si el contenedor ya existe y detenerlo si es necesario
      await this.stop();

      console.log('🐳 Iniciando contenedor MongoDB con Docker...');
      
      // Iniciar contenedor MongoDB
      const { stdout, stderr } = await execAsync(
        `docker run -d --name ${this.containerName} -p ${this.port}:27017 mongo:4.4-focal --quiet`
      );

      if (stderr && !stderr.includes('Unable to find image')) {
        console.warn('Docker stderr:', stderr);
      }

      // Esperar a que MongoDB esté listo
      await this.waitForMongo();

      const mongoUri = `mongodb://localhost:${this.port}/${this.dbName}`;
      console.log(`✅ MongoDB Docker iniciado correctamente en ${mongoUri}`);
      return mongoUri;

    } catch (error) {
      console.error('❌ Error al iniciar MongoDB Docker:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Detener y eliminar contenedor si existe
      await execAsync(`docker rm -f ${this.containerName} 2>/dev/null || true`);
      console.log(`🛑 Contenedor ${this.containerName} detenido y eliminado`);
    } catch (error) {
      // Ignorar errores si el contenedor no existe
      console.log(`ℹ️ Contenedor ${this.containerName} no existía`);
    }
  }

  private async waitForMongo(maxAttempts = 30): Promise<void> {
    console.log('⏳ Esperando a que MongoDB esté listo...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Usar 'mongo' en lugar de 'mongosh' para MongoDB 4.4
        const { stdout } = await execAsync(
          `docker exec ${this.containerName} mongo --eval "db.adminCommand('ping')" --quiet`
        );
        
        if (stdout.includes('ok')) {
          console.log(`✅ MongoDB listo después de ${attempt} intentos`);
          return;
        }
      } catch (error) {
        // MongoDB aún no está listo
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
      }
    }

    throw new Error(`MongoDB no estuvo listo después de ${maxAttempts} intentos`);
  }

  async isRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `docker ps --filter name=${this.containerName} --format "{{.Names}}"`
      );
      return stdout.trim() === this.containerName;
    } catch {
      return false;
    }
  }
}