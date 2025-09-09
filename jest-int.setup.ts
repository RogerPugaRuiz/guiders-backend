/**
 * Jest Integration Test Setup
 * Configuración global para los tests de integración con MongoDB Memory Server
 */

// Configurar variables de entorno para MongoDB Memory Server
// Para Apple Silicon (ARM64) usar versión compatible
process.env.MONGOMS_VERSION = '6.0.1';
process.env.MONGOMS_DISABLE_POSTINSTALL = '1';

// Extender timeout para CI/CD
jest.setTimeout(120000);
