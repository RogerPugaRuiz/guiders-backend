/**
 * Jest Integration Test Setup
 * Configuración global para los tests de integración con MongoDB Memory Server
 */

// Detectar si estamos en CI/CD
const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';

// Configurar variables de entorno para MongoDB Memory Server
// Para Apple Silicon (ARM64) usar versión compatible
// Para CI/CD usar configuración específica
if (isCI) {
  // Configuración específica para CI/CD (Ubuntu)
  process.env.MONGOMS_VERSION = '6.0.1';
  process.env.MONGOMS_DISABLE_POSTINSTALL = '1';
  process.env.MONGOMS_SYSTEM_BINARY = ''; // Forzar descarga, no usar sistema
  process.env.MONGOMS_DOWNLOAD_MIRROR = 'https://fastdl.mongodb.org';
  process.env.MONGOMS_DOWNLOAD_DIR = './mongodb-binaries';
  process.env.MONGOMS_ARCH = 'x64';
  process.env.MONGOMS_PLATFORM = 'linux';
  process.env.MONGOMS_SKIP_MD5 = 'true';
  console.log('🔧 MongoDB Memory Server configurado para CI/CD (Ubuntu x64)');
  console.log('🔧 Forzando descarga de binarios MongoDB');
} else {
  // Configuración para desarrollo local (Apple Silicon)
  process.env.MONGOMS_VERSION = '6.0.1';
  process.env.MONGOMS_DISABLE_POSTINSTALL = '1';
  process.env.MONGOMS_SYSTEM_BINARY = ''; // Forzar descarga también en local
  process.env.MONGOMS_SKIP_MD5 = 'true';
  console.log('🔧 MongoDB Memory Server configurado para desarrollo local');
}

// Extender timeout para CI/CD
const timeout = isCI ? 180000 : 120000; // 3 min en CI, 2 min local
jest.setTimeout(timeout);

console.log(`⏰ Jest timeout configurado: ${timeout / 1000}s (CI: ${isCI})`);
