/**
 * Jest E2E Test Setup
 * Configuración global para los tests E2E
 */

// Cargar variables de entorno específicas para tests
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env.test si existe, sino usar .env
const envPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: envPath });

// Configurar timeout extendido para tests E2E
jest.setTimeout(120000);

// Configurar variables de entorno de test si no están definidas
// MongoDB para tests - SIN autenticación
if (!process.env.TEST_MONGODB_HOST) {
  process.env.TEST_MONGODB_HOST = 'localhost';
}

if (!process.env.TEST_MONGODB_PORT) {
  process.env.TEST_MONGODB_PORT = '27018';
}

if (!process.env.TEST_MONGODB_DATABASE) {
  process.env.TEST_MONGODB_DATABASE = 'guiders_test';
}

// NO configurar username/password para MongoDB test (sin autenticación)
// Solo configurar las variables que NO existen para evitar errores
process.env.TEST_MONGODB_ROOT_USERNAME = '';
process.env.TEST_MONGODB_ROOT_PASSWORD = '';

// Configurar variables de PostgreSQL para tests
if (!process.env.TEST_DATABASE_HOST) {
  process.env.TEST_DATABASE_HOST = 'localhost';
}

if (!process.env.TEST_DATABASE_PORT) {
  process.env.TEST_DATABASE_PORT = '5433';
}

if (!process.env.TEST_DATABASE_USERNAME) {
  process.env.TEST_DATABASE_USERNAME = 'postgres';
}

if (!process.env.TEST_DATABASE_PASSWORD) {
  process.env.TEST_DATABASE_PASSWORD = 'postgres';
}

if (!process.env.TEST_DATABASE) {
  process.env.TEST_DATABASE = 'guiders_test';
}

console.log('🔧 E2E Test Setup configurado');
console.log(
  `🔧 MongoDB Test Host: ${process.env.TEST_MONGODB_HOST}:${process.env.TEST_MONGODB_PORT}`,
);
console.log(`🔧 MongoDB Test Database: ${process.env.TEST_MONGODB_DATABASE}`);
console.log(
  `🔧 PostgreSQL Test Host: ${process.env.TEST_DATABASE_HOST}:${process.env.TEST_DATABASE_PORT}`,
);
console.log(`🔧 PostgreSQL Test Database: ${process.env.TEST_DATABASE}`);
