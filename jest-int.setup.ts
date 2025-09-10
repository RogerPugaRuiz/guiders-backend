/**
 * Jest Integration Test Setup
 * Configuración global para los tests de integración con MongoDB Memory Server
 */

// Detectar si estamos en CI/CD
const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';

// Configurar variables de entorno para MongoDB Memory Server
// En CI evitar descarga de binarios usando configuración específica
if (isCI) {
  // Configuración específica para CI/CD - preferir binario del sistema si está disponible
  process.env.MONGOMS_DISABLE_POSTINSTALL = process.env.MONGOMS_DISABLE_POSTINSTALL ?? '1';
  process.env.MONGOMS_SKIP_MD5 = process.env.MONGOMS_SKIP_MD5 ?? 'true';

  process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION ?? '5.0.13'; // Versión estable
  process.env.MONGOMS_DOWNLOAD_DIR = process.env.MONGOMS_DOWNLOAD_DIR ?? './mongodb-binaries';

  console.log('🔧 MongoDB Memory Server configurado para CI/CD');
  console.log(
    `🔧 Preferencia: ${process.env.MONGOMS_SYSTEM_BINARY ? 'systemBinary' : 'download'} (version=${process.env.MONGOMS_VERSION})`,
  );
} else {
  // Configuración para desarrollo local
  process.env.MONGOMS_DISABLE_POSTINSTALL = process.env.MONGOMS_DISABLE_POSTINSTALL ?? '1';
  process.env.MONGOMS_SKIP_MD5 = process.env.MONGOMS_SKIP_MD5 ?? 'true';

  process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION ?? '6.0.1';
  process.env.MONGOMS_DOWNLOAD_DIR = process.env.MONGOMS_DOWNLOAD_DIR ?? './mongodb-binaries';

  console.log('🔧 MongoDB Memory Server configurado para desarrollo local');
}

// Extender timeout para CI/CD considerablemente
const timeout = isCI ? 300000 : 120000; // 5 min en CI, 2 min local
jest.setTimeout(timeout);

console.log(`⏰ Jest timeout configurado: ${timeout / 1000}s (CI: ${isCI})`);
