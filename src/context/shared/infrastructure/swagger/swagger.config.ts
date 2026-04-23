import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/**
 * Tags que forman parte de la API pública de Guiders.
 * Estos endpoints son los que se exponen en el spec público accesible
 * sin autenticación en /public/openapi.json.
 *
 * Los tags internos (admin, backoffice, diagnóstico) NO deben incluirse aquí.
 */
export const PUBLIC_API_TAGS = [
  'tracking-v2', // Ingesta de eventos del SDK embebido
  'visitors', // Identificación y datos de visitantes (visitor-v2.controller)
  'Chats V2', // Conversaciones (chat-v2, visitor-chats-v2, commercial-chats-v2)
  'Messages V2', // Mensajes del widget (message-v2.controller)
  'Autenticación de Usuarios', // Autenticación (auth-user.controller)
  'BFF Auth', // BFF auth para frontends web (bff-auth.controller)
  'API Keys', // Gestión de API Keys (api-key.controller)
  'sites', // Sitios web registrados (sites.controller)
  'companies', // Compañías y tenants (company.controller)
  'Leads - Administración CRM', // Gestión de leads admin (leads-admin.controller)
  'Leads - Contact Data', // Datos de contacto de leads (leads-contact.controller)
  'LLM Suggestions', // Sugerencias LLM (llm-suggestions.controller)
  'LLM Configuration', // Configuración LLM (llm-config.controller)
  'Consent', // Consentimientos RGPD (consent.controller)
  'health', // Health check público
];

/**
 * Configuración centralizada del documento OpenAPI de la API de Guiders.
 *
 * Esta función se utiliza tanto por `main.ts` (para servir Swagger UI en runtime
 * en `/docs`) como por el script `scripts/generate-openapi.ts` (para exportar
 * el contrato OpenAPI estático a `docs/api/openapi.{json,yaml}`).
 *
 * Mantener una única fuente de verdad evita divergencias entre el OpenAPI
 * que ven los usuarios en `/docs` y el que consumen equipos externos.
 *
 * ## Esquemas de seguridad
 *
 * Los nombres de los esquemas registrados aquí DEBEN coincidir exactamente con
 * los argumentos pasados a los decoradores `@ApiBearerAuth(name)`,
 * `@ApiCookieAuth(name)` y `@ApiSecurity(name)` en los controllers. NestJS
 * Swagger no valida esto en tiempo de build, pero Redocly emitirá errores
 * `security-defined` si hay nombres no registrados.
 *
 * Convención de nombres en este proyecto:
 * - `bearer` → `@ApiBearerAuth()` (sin argumento, valor por defecto del decorador).
 * - `access_token` → `@ApiCookieAuth('access_token')` (cookie principal del BFF).
 * - `cookie` → `@ApiCookieAuth()` (alias por defecto).
 * - `sid` → `@ApiCookieAuth('sid')` (cookie alternativa de sesión socket).
 * - `session` → `@ApiCookieAuth('session')` (cookie de sesión legacy).
 * - `api-key` → header `x-api-key` para SDK de tracking.
 */

export function buildSwaggerConfig(): Omit<OpenAPIObject, 'paths'> {
  return new DocumentBuilder()
    .setTitle('API Guiders Backend')
    .setDescription(
      [
        'Documentación oficial de la API REST del backend de Guiders.',
        '',
        '## Autenticación',
        '',
        'La API soporta tres mecanismos de autenticación:',
        '',
        '- **Bearer JWT** (`Authorization: Bearer <token>`): para clientes que',
        '  gestionan tokens manualmente (apps móviles, integraciones backend).',
        '- **Cookie de sesión** (`access_token`, `sid`, `session`): para',
        '  frontends web que usan el flujo BFF (Backend-for-Frontend) con',
        '  cookies HttpOnly.',
        '- **API Key** (`x-api-key`): para SDK de tracking embebido en sitios',
        '  de clientes y para integraciones server-to-server.',
        '',
        'La mayoría de endpoints administrativos aceptan tanto Bearer JWT como',
        'cookie de sesión (auth dual). Los endpoints de ingesta de eventos',
        'suelen requerir API Key.',
        '',
        '## Convenciones',
        '',
        '- Todos los identificadores son UUID v4.',
        '- Las fechas siguen ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`).',
        '- Los errores siguen el formato estándar de NestJS:',
        '  `{ statusCode, message, error }`.',
        '- Las operaciones de listado soportan paginación cursor-based.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .setContact(
      'Equipo Guiders',
      'https://github.com/anomalyco/guiders-backend',
      'support@guiders.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('https://api.guiders.ai', 'Producción')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT emitido por el servidor de autenticación',
      },
      'bearer',
    )
    .addCookieAuth(
      'access_token',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'access_token',
        description: 'Cookie HttpOnly emitida por el flujo BFF',
      },
      'access_token',
    )
    .addCookieAuth(
      'connect.sid',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
        description: 'Cookie de sesión por defecto (express-session)',
      },
      'cookie',
    )
    .addCookieAuth(
      'sid',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'sid',
        description: 'Cookie de sesión utilizada por el handshake Socket.IO',
      },
      'sid',
    )
    .addCookieAuth(
      'session',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'session',
        description: 'Cookie de sesión legacy',
      },
      'session',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API Key del tenant para ingesta de eventos del SDK',
      },
      'api-key',
    )
    .addTag(
      'Autenticación de Usuarios',
      'Autenticación y emisión de tokens para usuarios',
    )
    .addTag(
      'BFF Auth',
      'Backend-for-Frontend de autenticación basado en cookies',
    )
    .addTag('API Keys', 'Gestión de API Keys de tenants')
    .addTag('Chats V2', 'Conversaciones (V2 - MongoDB)')
    .addTag('Messages V2', 'Mensajes de conversaciones (V2 - MongoDB)')
    .addTag('Presence & Typing', 'Estado de presencia en chats')
    .addTag(
      'Reglas de Auto-asignamiento',
      'Reglas de asignación automática de comerciales',
    )
    .addTag('visitors', 'Visitantes y sesiones de tracking')
    .addTag('Site Visitors Management', 'Gestión de visitantes por sitio')
    .addTag('Tenant Visitors Management', 'Gestión de visitantes por tenant')
    .addTag('sites', 'Sitios web monitorizados')
    .addTag('tracking-v2', 'Ingesta de eventos de tracking')
    .addTag(
      'Leads - Administración CRM',
      'Gestión de leads y contactos comerciales (admin)',
    )
    .addTag('Leads - Contact Data', 'Datos de contacto de leads')
    .addTag('LLM Suggestions', 'Sugerencias de IA para comerciales')
    .addTag('LLM Configuration', 'Configuración de modelos de lenguaje')
    .addTag(
      'White Label Configuration',
      'Configuración white-label por compañía',
    )
    .addTag('Commercials', 'Operaciones comerciales')
    .addTag('companies', 'Gestión de compañías y tenants')
    .addTag('Consent', 'Gestión de consentimientos y RGPD')
    .addTag(
      'Pixel Visitor Auth',
      'Autenticación de visitantes para el pixel de tracking',
    )
    .addTag('JWKS', 'Claves públicas de verificación JWT (JWKS)')
    .addTag('health', 'Endpoints de salud y diagnóstico')
    .addTag(
      'internal-opensearch',
      'Endpoints internos de diagnóstico OpenSearch',
    )
    .build();
}

/**
 * Genera `operationId` predecibles y consistentes a partir del nombre del
 * controller y del método.
 */
export function operationIdFactory(
  controllerKey: string,
  methodKey: string,
): string {
  const tag = controllerKey
    .replace(/Controller$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
  return `${tag}_${methodKey}`;
}

/**
 * Crea el documento OpenAPI completo (interno) a partir de la aplicación NestJS.
 * Incluye todos los endpoints, incluidos los administrativos e internos.
 * Se sirve en /docs (Scalar UI) y /docs-json (spec JSON).
 */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = buildSwaggerConfig();
  return SwaggerModule.createDocument(app, config, {
    operationIdFactory,
    deepScanRoutes: true,
  });
}

/**
 * Construye la configuración del documento OpenAPI público.
 * Solo incluye los endpoints de la API pública — nunca endpoints internos,
 * de administración o de diagnóstico.
 */
export function buildPublicSwaggerConfig(): Omit<OpenAPIObject, 'paths'> {
  return new DocumentBuilder()
    .setTitle('Guiders Public API')
    .setDescription(
      [
        'API pública de Guiders para integraciones externas.',
        '',
        'Consulta la documentación completa en https://guiders.es/docs',
        '',
        '## Autenticación',
        '',
        '- **API Key** (`x-api-key`): para SDK de tracking y integraciones server-to-server.',
        '- **Bearer JWT** (`Authorization: Bearer <token>`): para operaciones autenticadas.',
        '',
        '## Convenciones',
        '',
        '- Todos los identificadores son UUID v4.',
        '- Las fechas siguen ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`).',
        '- Los errores siguen el formato: `{ statusCode, message, error }`.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .setContact('Equipo Guiders', 'https://guiders.es', 'support@guiders.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('https://guiders.es', 'Producción')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API Key del tenant para ingesta de eventos del SDK',
      },
      'api-key',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT emitido por el servidor de autenticación',
      },
      'bearer',
    )
    .build();
}

/**
 * Crea el documento OpenAPI público filtrado solo a los tags de la API pública.
 * Se sirve en /public/openapi.json (sin autenticación, con CORS abierto).
 */
export function createPublicOpenApiDocument(
  app: INestApplication,
): OpenAPIObject {
  const config = buildPublicSwaggerConfig();
  const fullDoc = SwaggerModule.createDocument(app, config, {
    operationIdFactory,
    deepScanRoutes: true,
  });

  // Filtrar paths: conservar solo los que pertenecen a tags públicos
  const filteredPaths: OpenAPIObject['paths'] = {};
  for (const [path, pathItem] of Object.entries(fullDoc.paths ?? {})) {
    const filteredMethods: typeof pathItem = {};
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      const op = operation as { tags?: string[] };
      if (op?.tags?.some((tag) => PUBLIC_API_TAGS.includes(tag))) {
        filteredMethods[method] = operation;
      }
    }
    if (Object.keys(filteredMethods).length > 0) {
      filteredPaths[path] = filteredMethods;
    }
  }

  return { ...fullDoc, paths: filteredPaths };
}
