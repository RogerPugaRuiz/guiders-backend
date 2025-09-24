/**
 * Jest E2E Test Setup for CI/CD
 * Configuración específica para tests E2E en GitHub Actions
 */

// Configurar timeout extendido para tests E2E en CI
jest.setTimeout(180000); // Aumentado para CI lento

// Detectar si estamos en CI/CD
const isCIEnvironment =
  process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const nodeEnv = process.env.NODE_ENV || 'test';

console.log('🔧 E2E CI Setup configurado');
console.log(`Environment: ${nodeEnv}`);
console.log(`CI detected: ${isCIEnvironment}`);

// Configuración específica para MongoDB en CI
if (isCIEnvironment) {
  // En CI usamos MongoDB Memory Server con configuración específica
  process.env.MONGOMS_VERSION = '5.0.13';
  process.env.MONGOMS_DOWNLOAD_DIR = './mongodb-binaries';
  process.env.MONGOMS_DISABLE_POSTINSTALL = '1';
  process.env.MONGOMS_SKIP_MD5 = 'true';

  // Si existe el binario del sistema, usarlo
  if (process.env.MONGOMS_SYSTEM_BINARY) {
    console.log('🔧 Usando binario MongoDB del sistema en CI');
  } else {
    console.log('🔧 Descargando binario MongoDB para CI');
  }

  // Variables de MongoDB para tests E2E en CI - usar Memory Server
  process.env.TEST_MONGODB_HOST = 'localhost';
  process.env.TEST_MONGODB_PORT = '0'; // Puerto dinámico para Memory Server
  process.env.TEST_MONGODB_DATABASE = 'guiders-test-e2e';
  process.env.TEST_MONGODB_ROOT_USERNAME = 'admin_test';
  process.env.TEST_MONGODB_ROOT_PASSWORD = 'admin123';

  // Variables de PostgreSQL para tests E2E en CI
  process.env.TEST_DATABASE_HOST = 'localhost';
  process.env.TEST_DATABASE_PORT = '5432';
  process.env.TEST_DATABASE_USERNAME = 'postgres';
  process.env.TEST_DATABASE_PASSWORD = 'postgres';
  process.env.TEST_DATABASE = 'test';

  console.log('✅ Configuración MongoDB Memory Server para CI aplicada');
} else {
  // Configuración para desarrollo local (mantener comportamiento existente)
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
    process.env.TEST_MONGODB_PORT = '27018';
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

  console.log('✅ Configuración para desarrollo local aplicada');
}

// Configurar variables adicionales que requiere el módulo principal
if (!process.env.MONGODB_USERNAME) {
  process.env.MONGODB_USERNAME = process.env.TEST_MONGODB_ROOT_USERNAME;
}

if (!process.env.MONGODB_PASSWORD) {
  process.env.MONGODB_PASSWORD = process.env.TEST_MONGODB_ROOT_PASSWORD;
}

if (!process.env.MONGODB_HOST) {
  process.env.MONGODB_HOST = process.env.TEST_MONGODB_HOST;
}

if (!process.env.MONGODB_PORT) {
  process.env.MONGODB_PORT = process.env.TEST_MONGODB_PORT;
}

if (!process.env.MONGODB_DATABASE) {
  process.env.MONGODB_DATABASE = process.env.TEST_MONGODB_DATABASE;
}

// Variables adicionales requeridas para el módulo principal
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!!';
}

if (!process.env.GLOBAL_TOKEN_SECRET) {
  process.env.GLOBAL_TOKEN_SECRET = 'test-secret-key';
}

if (!process.env.ACCESS_TOKEN_EXPIRATION) {
  process.env.ACCESS_TOKEN_EXPIRATION = '15m';
}

if (!process.env.REFRESH_TOKEN_EXPIRATION) {
  process.env.REFRESH_TOKEN_EXPIRATION = '7d';
}

console.log('🔧 Configuración final aplicada:');
console.log(
  `🔧 MongoDB: ${process.env.TEST_MONGODB_HOST}:${process.env.TEST_MONGODB_PORT}/${process.env.TEST_MONGODB_DATABASE}`,
);
console.log(
  `🔧 PostgreSQL: ${process.env.TEST_DATABASE_HOST}:${process.env.TEST_DATABASE_PORT}/${process.env.TEST_DATABASE}`,
);
