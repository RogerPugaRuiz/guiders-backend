/**
 * Genera el contrato OpenAPI estático del backend de Guiders.
 *
 * Crea un contexto de aplicación NestJS sin levantar servidor HTTP,
 * extrae el documento OpenAPI usando la configuración compartida
 * (src/context/shared/infrastructure/swagger) y lo escribe en disco
 * como JSON y YAML en `docs/api/`.
 *
 * Uso:
 *   npm run openapi:generate
 *
 * Variables de entorno:
 *   OPENAPI_OUTPUT_DIR  - directorio de salida (default: docs/api)
 *   OPENAPI_VERSION     - versión semántica a estampar (default: la del package.json)
 *
 * Salida:
 *   docs/api/openapi.json
 *   docs/api/openapi.yaml
 */
import 'reflect-metadata';

// Activar modo generación ANTES de importar AppModule.
// AppModule lee este flag para usar drivers en memoria (SQLite) y evitar
// conectarse a Postgres reales. Para Mongoose levantamos un servidor en
// memoria justo antes de instanciar la app.
process.env.OPENAPI_GENERATION = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { dump as yamlDump } from 'js-yaml';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve, join } from 'path';

// Importar mongodb-memory-server resolviendo el `main` del package.json
// directamente para esquivar el resolver de tsconfig-paths (que con
// baseUrl=./ podría confundirse con el archivo `mongodb-memory-server.json`
// de la raíz del proyecto).
const mongoPkgPath = resolve(
  __dirname,
  '..',
  'node_modules',
  'mongodb-memory-server',
  'package.json',
);
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const mongoPkg = require(mongoPkgPath) as { main?: string };
const mongoMainPath = resolve(
  __dirname,
  '..',
  'node_modules',
  'mongodb-memory-server',
  mongoPkg.main || 'lib/index.js',
);
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const mongoMemoryServerModule = require(mongoMainPath);
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const MongoMemoryServer = mongoMemoryServerModule.MongoMemoryServer as {
  create(): Promise<{ getUri(): string; stop(): Promise<boolean> }>;
};

import { AppModule } from '../src/app.module';
import { createOpenApiDocument } from '../src/context/shared/infrastructure/swagger';

const logger = new Logger('GenerateOpenApi');

interface PackageJson {
  version?: string;
}

function loadProjectVersion(): string {
  try {
    const pkgPath = resolve(__dirname, '..', 'package.json');
    if (!existsSync(pkgPath)) return '1.0.0';
    const raw = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw) as PackageJson;
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

async function generate(): Promise<void> {
  const startedAt = Date.now();

  // 1) Levantar MongoDB en memoria para que Mongoose no intente conectar a uno real.
  logger.log('Levantando MongoDB en memoria para generación...');
  const mongo = await MongoMemoryServer.create();
  process.env.OPENAPI_MONGO_URI = mongo.getUri();

  logger.log('Inicializando contexto NestJS (sin servidor HTTP)...');

  // createApplicationContext arranca los providers sin abrir puertos HTTP.
  // Sin embargo, SwaggerModule necesita la app HTTP completa para escanear
  // controllers, así que usamos NestFactory.create con `bufferLogs` y nunca
  // llamamos `listen()`.
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
    abortOnError: false,
  });

  // Aplicar el mismo prefijo global que usa main.ts para que las rutas
  // del OpenAPI coincidan con las reales en producción.
  app.setGlobalPrefix('api', {
    exclude: ['docs', 'docs-json', 'jwks', 'health', '/'],
  });

  logger.log('Generando documento OpenAPI...');
  const document = createOpenApiDocument(app);

  // Sobrescribir versión si viene por env (útil en CI)
  const version = process.env.OPENAPI_VERSION || loadProjectVersion();
  document.info.version = version;

  // Resolver carpeta de salida
  const outputDir = resolve(
    __dirname,
    '..',
    process.env.OPENAPI_OUTPUT_DIR || 'docs/api',
  );
  mkdirSync(outputDir, { recursive: true });

  // Escribir JSON
  const jsonPath = join(outputDir, 'openapi.json');
  writeFileSync(jsonPath, JSON.stringify(document, null, 2), 'utf-8');
  logger.log(`OpenAPI JSON escrito en: ${jsonPath}`);

  // Escribir YAML
  const yamlPath = join(outputDir, 'openapi.yaml');
  writeFileSync(
    yamlPath,
    yamlDump(document, {
      indent: 2,
      lineWidth: 120,
      noRefs: false,
      sortKeys: false,
    }),
    'utf-8',
  );
  logger.log(`OpenAPI YAML escrito en: ${yamlPath}`);

  // Estadísticas para el log
  const pathCount = Object.keys(document.paths || {}).length;
  const operationCount = Object.values(document.paths || {}).reduce(
    (acc, pathItem) => {
      if (!pathItem) return acc;
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
      return (
        acc +
        methods.filter((m) => (pathItem as Record<string, unknown>)[m]).length
      );
    },
    0,
  );
  const schemaCount = Object.keys(document.components?.schemas || {}).length;
  const tagCount = (document.tags || []).length;

  await app.close();
  await mongo.stop();

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);
  logger.log('---');
  logger.log(`✓ OpenAPI v${version} generado en ${elapsed}s`);
  logger.log(`  Paths: ${pathCount}`);
  logger.log(`  Operaciones: ${operationCount}`);
  logger.log(`  Schemas (DTOs): ${schemaCount}`);
  logger.log(`  Tags: ${tagCount}`);
  logger.log('---');
  logger.log('Siguiente paso: validar con `npm run openapi:lint`');
}

generate().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Error generando OpenAPI:', error);
  process.exit(1);
});
