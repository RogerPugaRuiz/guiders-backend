// Configuración para los tests de integración
process.env.NODE_ENV = 'test';

// Configuración específica para MongoDB Memory Server en CI
if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
  process.env.MONGOMS_VERSION = '4.4.18';
  process.env.MONGOMS_DOWNLOAD_DIR = './mongodb-binaries';
  process.env.MONGOMS_DISABLE_POSTINSTALL = '1';
  process.env.MONGOMS_SYSTEM_BINARY = '';
}

// Configuración para manejar timeouts largos
jest.setTimeout(120000);
