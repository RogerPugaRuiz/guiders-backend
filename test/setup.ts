// test/setup.ts
import * as dotenv from 'dotenv';
dotenv.config();

// Aumentar el timeout global de Jest si necesario
jest.setTimeout(30000);

// Esta función se ejecuta antes de todas las pruebas
beforeAll(async () => {
  // Asegurarse de que las variables de entorno estén correctamente configuradas
  process.env.NODE_ENV = 'test';
  
  // Usar variables de entorno para la conexión a servicios en CI
  if (!process.env.TEST_DATABASE_HOST) {
    process.env.TEST_DATABASE_HOST = process.env.CI ? 'postgres' : 'localhost';
  }
  
  if (!process.env.TEST_DATABASE_PORT) {
    process.env.TEST_DATABASE_PORT = '5432';
  }
  
  if (!process.env.TEST_DATABASE_USERNAME) {
    process.env.TEST_DATABASE_USERNAME = 'test';
  }
  
  if (!process.env.TEST_DATABASE_PASSWORD) {
    process.env.TEST_DATABASE_PASSWORD = 'test';
  }
  
  if (!process.env.TEST_DATABASE) {
    process.env.TEST_DATABASE = 'guiders_test';
  }
  
  // Configurar la URL de conexión a Redis
  if (!process.env.REDIS_URL) {
    process.env.REDIS_URL = process.env.CI ? 'redis://redis:6379' : 'redis://localhost:6379';
  }
  
  console.log('Environment setup complete');
});

// Esta función se ejecuta después de todas las pruebas
afterAll(async () => {
  // Limpieza global si es necesaria
  console.log('Test cleanup complete');
});