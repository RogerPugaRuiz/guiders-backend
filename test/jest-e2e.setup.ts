/**
 * Jest E2E Test Setup
 * Configuración global para los tests E2E
 */

// Configurar timeout extendido para tests E2E
jest.setTimeout(120000);

// Configurar variables de entorno de test si no están definidas
if (!process.env.TEST_MONGODB_ROOT_USERNAME) {
  process.env.TEST_MONGODB_ROOT_USERNAME = 'admin_test';
}

if (!process.env.TEST_MONGODB_ROOT_PASSWORD) {
  process.env.TEST_MONGODB_ROOT_PASSWORD = 'admin123';
}

if (!process.env.TEST_MONGODB_HOST) {
  process.env.TEST_MONGODB_HOST = 'localhost';
}

if (!process.env.TEST_MONGODB_PORT) {
  process.env.TEST_MONGODB_PORT = '27017';
}

if (!process.env.TEST_MONGODB_DATABASE) {
  process.env.TEST_MONGODB_DATABASE = 'guiders-test';
}

// Configurar variables de PostgreSQL para tests
if (!process.env.TEST_DATABASE_HOST) {
  process.env.TEST_DATABASE_HOST = 'localhost';
}

if (!process.env.TEST_DATABASE_PORT) {
  process.env.TEST_DATABASE_PORT = '5432';
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

// Configurar variables adicionales que requiere el módulo principal
if (!process.env.MONGODB_USERNAME) {
  process.env.MONGODB_USERNAME = process.env.TEST_MONGODB_ROOT_USERNAME;
}

if (!process.env.MONGODB_PASSWORD) {
  process.env.MONGODB_PASSWORD = process.env.TEST_MONGODB_ROOT_PASSWORD;
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
