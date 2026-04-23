/**
 * Test de cobertura de documentación OpenAPI.
 *
 * Levanta la aplicación NestJS con el mismo mecanismo que `scripts/generate-openapi.ts`
 * (OPENAPI_GENERATION=true + MongoDB en memoria) y analiza el documento generado
 * para detectar zonas sin documentar.
 *
 * Métricas evaluadas por operación (endpoint + método HTTP):
 *   - summary presente en @ApiOperation
 *   - Al menos un @ApiResponse documentado
 *   - Al menos una respuesta 2xx o 3xx documentada (los redirects OAuth cuentan como éxito)
 *
 * Métricas evaluadas por schema (DTO):
 *   - Al menos una propiedad con @ApiProperty (schema no vacío)
 *
 * Al final del test se imprime un reporte de cobertura con el porcentaje
 * de operaciones y schemas completamente documentados. El test falla si
 * la cobertura cae por debajo de los umbrales configurados en THRESHOLDS.
 */

// Activar modo generación ANTES de cualquier import para que AppModule
// use SQLite en memoria y evite conectar a Postgres/MongoDB reales.
process.env.OPENAPI_GENERATION = 'true';
process.env.NODE_ENV = 'test';

import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';

// Tipos auxiliares del spec OpenAPI 3.x no exportados por @nestjs/swagger
type OperationObject = {
  summary?: string;
  operationId?: string;
  tags?: string[];
  responses?: Record<string, unknown>;
};

type SchemaObject = {
  properties?: Record<string, unknown>;
  enum?: unknown[];
};
import { AppModule } from '../src/app.module';
import { createOpenApiDocument } from '../src/context/shared/infrastructure/swagger';

// ─── Umbrales de cobertura ────────────────────────────────────────────────────
// Modifica estos valores para ajustar el nivel de exigencia del test.
const THRESHOLDS = {
  /** % mínimo de operaciones con summary */
  operationSummary: 95,
  /** % mínimo de operaciones con al menos un @ApiResponse */
  operationResponses: 95,
  /** % mínimo de operaciones con al menos una respuesta 2xx o 3xx */
  operation2xxResponse: 95,
  /** % mínimo de schemas de respuesta con propiedades documentadas */
  schemaProperties: 95,
};

// ─── Tipos auxiliares ─────────────────────────────────────────────────────────

interface OperationIssues {
  path: string;
  method: string;
  missingSummary: boolean;
  missingResponses: boolean;
  missing2xx: boolean;
}

interface SchemaIssue {
  name: string;
  reason: string;
}

interface CoverageReport {
  totalOperations: number;
  operationsWithSummary: number;
  operationsWithResponses: number;
  operationsWith2xx: number;
  totalSchemas: number;
  schemasWithProperties: number;
  operationIssues: OperationIssues[];
  schemaIssues: SchemaIssue[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
] as const;

/**
 * Extrae todas las operaciones del documento OpenAPI como una lista plana.
 */
function extractOperations(
  doc: OpenAPIObject,
): Array<{ path: string; method: string; op: OperationObject }> {
  const result: Array<{ path: string; method: string; op: OperationObject }> =
    [];
  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const op = (pathItem as Record<string, unknown>)[method] as
        | OperationObject
        | undefined;
      if (op) result.push({ path, method, op });
    }
  }
  return result;
}

/**
 * Analiza el documento y devuelve el reporte de cobertura.
 */
function analyzeCoverage(doc: OpenAPIObject): CoverageReport {
  const operations = extractOperations(doc);
  const schemas = doc.components?.schemas ?? {};

  const operationIssues: OperationIssues[] = [];
  let operationsWithSummary = 0;
  let operationsWithResponses = 0;
  let operationsWith2xx = 0;

  for (const { path, method, op } of operations) {
    const hasSummary = Boolean(op.summary?.trim());
    const responses = op.responses ?? {};
    const responseCodes = Object.keys(responses);
    const hasResponses = responseCodes.length > 0;
    const has2xx = responseCodes.some(
      (code) =>
        code.startsWith('2') || code.startsWith('3') || code === 'default',
    );

    if (hasSummary) operationsWithSummary++;
    if (hasResponses) operationsWithResponses++;
    if (has2xx) operationsWith2xx++;

    if (!hasSummary || !hasResponses || !has2xx) {
      operationIssues.push({
        path,
        method: method.toUpperCase(),
        missingSummary: !hasSummary,
        missingResponses: !hasResponses,
        missing2xx: !has2xx,
      });
    }
  }

  const schemaIssues: SchemaIssue[] = [];
  let schemasWithProperties = 0;

  for (const [name, schemaDef] of Object.entries(schemas)) {
    const schema = schemaDef as SchemaObject;
    const props = schema.properties ?? {};
    const hasProperties = Object.keys(props).length > 0;

    // Ignorar schemas que son enums puros (no necesitan @ApiProperty)
    if (schema.enum) {
      schemasWithProperties++;
      continue;
    }

    if (hasProperties) {
      schemasWithProperties++;
    } else {
      schemaIssues.push({
        name,
        reason:
          'Sin propiedades documentadas (posibles @ApiProperty faltantes)',
      });
    }
  }

  return {
    totalOperations: operations.length,
    operationsWithSummary,
    operationsWithResponses,
    operationsWith2xx,
    totalSchemas: Object.keys(schemas).length,
    schemasWithProperties,
    operationIssues,
    schemaIssues,
  };
}

/**
 * Calcula el porcentaje con 1 decimal. Devuelve 100 si el total es 0.
 */
function pct(value: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((value / total) * 1000) / 10;
}

/**
 * Imprime el reporte de cobertura en la consola.
 */
function printReport(report: CoverageReport): void {
  const summaryPct = pct(report.operationsWithSummary, report.totalOperations);
  const responsesPct = pct(
    report.operationsWithResponses,
    report.totalOperations,
  );
  const twoxxPct = pct(report.operationsWith2xx, report.totalOperations);
  const schemaPct = pct(report.schemasWithProperties, report.totalSchemas);

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  REPORTE DE COBERTURA OPENAPI');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`\n  Operaciones totales : ${report.totalOperations}`);
  console.log(`  Schemas totales     : ${report.totalSchemas}`);
  console.log('\n  ── Cobertura de operaciones ─────────────────────────');
  console.log(
    `  Con summary         : ${report.operationsWithSummary}/${report.totalOperations}  (${summaryPct}%) [umbral: ${THRESHOLDS.operationSummary}%]`,
  );
  console.log(
    `  Con @ApiResponse    : ${report.operationsWithResponses}/${report.totalOperations}  (${responsesPct}%) [umbral: ${THRESHOLDS.operationResponses}%]`,
  );
  console.log(
    `  Con respuesta 2xx/3xx : ${report.operationsWith2xx}/${report.totalOperations}  (${twoxxPct}%) [umbral: ${THRESHOLDS.operation2xxResponse}%]`,
  );
  console.log('\n  ── Cobertura de schemas (DTOs) ─────────────────────');
  console.log(
    `  Con propiedades     : ${report.schemasWithProperties}/${report.totalSchemas}  (${schemaPct}%) [umbral: ${THRESHOLDS.schemaProperties}%]`,
  );

  if (report.operationIssues.length > 0) {
    console.log('\n  ── Operaciones con problemas ────────────────────────');
    for (const issue of report.operationIssues) {
      const flags: string[] = [];
      if (issue.missingSummary) flags.push('sin summary');
      if (issue.missingResponses) flags.push('sin @ApiResponse');
      if (issue.missing2xx) flags.push('sin respuesta 2xx/3xx');
      console.log(`  [${issue.method}] ${issue.path}`);
      console.log(`       → ${flags.join(', ')}`);
    }
  }

  if (report.schemaIssues.length > 0) {
    console.log('\n  ── Schemas con problemas ────────────────────────────');
    for (const issue of report.schemaIssues) {
      console.log(`  ${issue.name}`);
      console.log(`       → ${issue.reason}`);
    }
  }

  console.log('\n══════════════════════════════════════════════════════════\n');
}

// ─── Suite de tests ───────────────────────────────────────────────────────────

describe('OpenAPI — Cobertura de documentación', () => {
  let app: INestApplication;
  let document: OpenAPIObject;
  let report: CoverageReport;

  // MongoDB en memoria — mismo mecanismo que scripts/generate-openapi.ts
  let mongoServer: { getUri(): string; stop(): Promise<boolean> };

  beforeAll(async () => {
    // Resolver mongodb-memory-server sin que tsconfig-paths interfiera
    const mongoPkgPath = resolve(
      __dirname,
      '..',
      'node_modules',
      'mongodb-memory-server',
      'package.json',
    );

    const mongoPkg = (await import(mongoPkgPath)) as { main?: string };
    const mongoMainPath = resolve(
      __dirname,
      '..',
      'node_modules',
      'mongodb-memory-server',
      mongoPkg.main || 'lib/index.js',
    );

    const mongoMemoryServerModule = await import(mongoMainPath);

    const MongoMemoryServer = mongoMemoryServerModule.MongoMemoryServer as {
      create(): Promise<{ getUri(): string; stop(): Promise<boolean> }>;
    };

    mongoServer = await MongoMemoryServer.create();
    process.env.OPENAPI_MONGO_URI = mongoServer.getUri();

    app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
    });

    app.setGlobalPrefix('api', {
      exclude: ['docs', 'docs-json', 'jwks', 'health', '/'],
    });

    document = createOpenApiDocument(app);
    report = analyzeCoverage(document);
    printReport(report);
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await mongoServer?.stop();
  });

  // ── Operaciones ─────────────────────────────────────────────────────────────

  it('debe tener operaciones documentadas en el spec', () => {
    expect(report.totalOperations).toBeGreaterThan(0);
  });

  it(`cobertura de summary >= ${THRESHOLDS.operationSummary}%`, () => {
    const coverage = pct(report.operationsWithSummary, report.totalOperations);
    if (coverage < THRESHOLDS.operationSummary) {
      const missing = report.operationIssues
        .filter((i) => i.missingSummary)
        .map((i) => `  [${i.method}] ${i.path}`)
        .join('\n');
      throw new Error(
        `Cobertura de summary: ${coverage}% (umbral: ${THRESHOLDS.operationSummary}%)\n` +
          `Operaciones sin summary:\n${missing}`,
      );
    }
    expect(coverage).toBeGreaterThanOrEqual(THRESHOLDS.operationSummary);
  });

  it(`cobertura de @ApiResponse >= ${THRESHOLDS.operationResponses}%`, () => {
    const coverage = pct(
      report.operationsWithResponses,
      report.totalOperations,
    );
    if (coverage < THRESHOLDS.operationResponses) {
      const missing = report.operationIssues
        .filter((i) => i.missingResponses)
        .map((i) => `  [${i.method}] ${i.path}`)
        .join('\n');
      throw new Error(
        `Cobertura de @ApiResponse: ${coverage}% (umbral: ${THRESHOLDS.operationResponses}%)\n` +
          `Operaciones sin respuestas:\n${missing}`,
      );
    }
    expect(coverage).toBeGreaterThanOrEqual(THRESHOLDS.operationResponses);
  });

  it(`cobertura de respuesta 2xx/3xx >= ${THRESHOLDS.operation2xxResponse}%`, () => {
    const coverage = pct(report.operationsWith2xx, report.totalOperations);
    if (coverage < THRESHOLDS.operation2xxResponse) {
      const missing = report.operationIssues
        .filter((i) => i.missing2xx)
        .map((i) => `  [${i.method}] ${i.path}`)
        .join('\n');
      throw new Error(
        `Cobertura de respuesta 2xx/3xx: ${coverage}% (umbral: ${THRESHOLDS.operation2xxResponse}%)\n` +
          `Operaciones sin respuesta 2xx/3xx:\n${missing}`,
      );
    }
    expect(coverage).toBeGreaterThanOrEqual(THRESHOLDS.operation2xxResponse);
  });

  // ── Schemas / DTOs ───────────────────────────────────────────────────────────

  it(`cobertura de schemas con propiedades >= ${THRESHOLDS.schemaProperties}%`, () => {
    const coverage = pct(report.schemasWithProperties, report.totalSchemas);
    if (coverage < THRESHOLDS.schemaProperties) {
      const missing = report.schemaIssues
        .map((s) => `  ${s.name}: ${s.reason}`)
        .join('\n');
      throw new Error(
        `Cobertura de schemas: ${coverage}% (umbral: ${THRESHOLDS.schemaProperties}%)\n` +
          `Schemas sin propiedades:\n${missing}`,
      );
    }
    expect(coverage).toBeGreaterThanOrEqual(THRESHOLDS.schemaProperties);
  });

  // ── Integridad estructural ───────────────────────────────────────────────────

  it('el spec debe tener título y versión', () => {
    expect(document.info?.title).toBeTruthy();
    expect(document.info?.version).toBeTruthy();
  });

  it('todos los tags usados en operaciones deben estar definidos en el spec', () => {
    const definedTags = new Set((document.tags ?? []).map((t) => t.name));
    const operations = extractOperations(document);
    const undefinedTags: string[] = [];

    for (const { path, method, op } of operations) {
      for (const tag of op.tags ?? []) {
        if (!definedTags.has(tag)) {
          undefinedTags.push(
            `[${method.toUpperCase()}] ${path} → tag: "${tag}"`,
          );
        }
      }
    }

    if (undefinedTags.length > 0) {
      throw new Error(
        `Tags usados en operaciones pero no definidos en el spec:\n` +
          undefinedTags.map((t) => `  ${t}`).join('\n'),
      );
    }

    expect(undefinedTags.length).toBe(0);
  });

  it('no debe haber operationIds duplicados', () => {
    const operations = extractOperations(document);
    const seen = new Map<string, string>();
    const duplicates: string[] = [];

    for (const { path, method, op } of operations) {
      const opId = op.operationId;
      if (!opId) continue;
      if (seen.has(opId)) {
        duplicates.push(
          `"${opId}" usado en [${method.toUpperCase()}] ${path} y [${seen.get(opId)}]`,
        );
      } else {
        seen.set(opId, `${method.toUpperCase()}] ${path}`);
      }
    }

    if (duplicates.length > 0) {
      throw new Error(
        `OperationIds duplicados:\n` +
          duplicates.map((d) => `  ${d}`).join('\n'),
      );
    }

    expect(duplicates.length).toBe(0);
  });
});
