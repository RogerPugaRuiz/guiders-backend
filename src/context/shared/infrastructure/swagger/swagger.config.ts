import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

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
    .addTag('auth', 'Autenticación y emisión de tokens')
    .addTag(
      'bff-auth',
      'Backend-for-Frontend de autenticación basado en cookies',
    )
    .addTag('api-keys', 'Gestión de API Keys de tenants')
    .addTag('chats', 'Conversaciones (V2 - MongoDB)')
    .addTag('messages', 'Mensajes de conversaciones')
    .addTag('presence', 'Estado de presencia en chats')
    .addTag(
      'assignment-rules',
      'Reglas de asignación automática de comerciales',
    )
    .addTag('visitors', 'Visitantes y sesiones de tracking')
    .addTag('sites', 'Sitios web monitorizados')
    .addTag('tracking-v2', 'Ingesta de eventos de tracking')
    .addTag('leads', 'Gestión de leads y contactos comerciales')
    .addTag('llm', 'Integración con modelos de lenguaje (LLM)')
    .addTag('white-label', 'Configuración white-label por compañía')
    .addTag('commercials', 'Operaciones comerciales')
    .addTag('companies', 'Gestión de compañías y tenants')
    .addTag('consents', 'Gestión de consentimientos y RGPD')
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
 * Crea el documento OpenAPI completo a partir de la aplicación NestJS.
 */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = buildSwaggerConfig();
  return SwaggerModule.createDocument(app, config, {
    operationIdFactory,
    deepScanRoutes: true,
  });
}
