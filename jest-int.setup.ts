/**
 * Jest Integration Test Setup
 * Configuración global para los tests de integración con MongoDB Memory Server
 */

// Detectar si estamos en CI/CD
const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';

// Configurar variables de entorno para MongoDB Memory Server
// Usar configuración específica para evitar problemas de descarga
if (isCI) {
  // Configuración para CI/CD - usar mirror alternativo y versión estable
  process.env.MONGOMS_VERSION = '4.4.25';
  process.env.MONGOMS_DISABLE_POSTINSTALL = '1';
  process.env.MONGOMS_SKIP_MD5 = 'true';
  process.env.MONGOMS_DOWNLOAD_DIR = './mongodb-binaries';
  process.env.MONGOMS_DOWNLOAD_MIRROR = 'https://downloads.mongodb.org';
  process.env.MONGOMS_PREFER_GLOBAL_PATH = '1';
  console.log('🔧 MongoDB Memory Server configurado para CI/CD');
  console.log('🔧 Usando versión 4.4.25 con mirror de descarga alternativo');
} else {
  // Configuración para desarrollo local
  process.env.MONGOMS_VERSION = '4.4.25';
  process.env.MONGOMS_DISABLE_POSTINSTALL = '1';
  process.env.MONGOMS_SKIP_MD5 = 'true';
  process.env.MONGOMS_PREFER_GLOBAL_PATH = '1';
  console.log('🔧 MongoDB Memory Server configurado para desarrollo local');
}

// Extender timeout para CI/CD
const timeout = isCI ? 360000 : 120000; // 6 min en CI para permitir descarga, 2 min local
jest.setTimeout(timeout);

console.log(`⏰ Jest timeout configurado: ${timeout / 1000}s (CI: ${isCI})`);
