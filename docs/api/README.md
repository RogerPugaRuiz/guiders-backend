# Guiders Backend — OpenAPI Contract

Este directorio contiene el contrato OpenAPI 3.0 del backend de Guiders, generado
automáticamente desde el código fuente (NestJS + decoradores Swagger).

Está destinado a equipos externos que necesiten:

- Generar clientes tipados (SDKs) en cualquier lenguaje.
- Construir integraciones sobre la API REST de Guiders.
- Alimentar agentes de IA con el esquema completo de operaciones y DTOs.

## Archivos

| Archivo                | Descripción                                       |
| ---------------------- | ------------------------------------------------- |
| `openapi.json`         | Contrato OpenAPI en JSON (recomendado para tooling) |
| `openapi.yaml`         | Mismo contrato en YAML (legible para humanos)     |

Ambos archivos contienen exactamente la misma información. Elige el formato que
mejor encaje con tu pipeline.

## Datos de contacto con la API

| Dato                 | Valor                                         |
| -------------------- | --------------------------------------------- |
| Servidor producción  | `https://api.guiders.ai`                      |
| Prefijo global       | `/api` (excepto `/`, `/health`, `/jwks`, `/docs`) |
| Formato de respuesta | JSON (`application/json`)                     |
| Autenticación        | JWT Bearer, Cookies de sesión, API Key (ver abajo) |
| Transporte real-time | WebSocket (no cubierto por este OpenAPI)      |

## Cobertura

- **134 paths** documentados
- **147 operaciones** (GET/POST/PUT/PATCH/DELETE)
- **158 schemas** (DTOs de request/response)
- **19 tags** agrupando operaciones por dominio

### Tags principales

| Tag                       | Responsabilidad                                    |
| ------------------------- | -------------------------------------------------- |
| `auth`                    | Login, registro, refresh token, usuarios           |
| `bff-auth`                | Flujo OAuth Google (BFF con redirects)             |
| `api-keys`                | Gestión y rotación de API keys (widget RSA/JWKS)   |
| `integration-api-keys`    | API keys REST para integraciones server-to-server  |
| `chats`                   | Conversaciones (V2, MongoDB)                       |
| `messages`                | Mensajes dentro de chats                           |
| `presence`                | Estado online/offline de comerciales y visitantes  |
| `assignment-rules`        | Reglas de asignación automática de chats           |
| `visitors`                | Identificación y gestión de visitantes             |
| `sites`                   | Dominios y tenants                                 |
| `tracking-v2`             | Ingesta de eventos de analytics desde el SDK       |
| `leads`                   | Captura y gestión de leads                         |
| `llm`                     | Configuración y sugerencias del asistente IA       |
| `white-label`             | Personalización visual por tenant                  |
| `commercials`             | Comerciales disponibles / activos                  |
| `companies`               | Gestión de empresas (multi-tenant)                 |
| `consents`                | Consentimiento GDPR                                |
| `health`                  | Smoke tests y liveness probes                      |
| `internal-opensearch`     | Operaciones internas OpenSearch (no uso externo)   |

## Autenticación

El contrato declara tres esquemas de seguridad que el equipo consumidor debe
conocer:

### 1. JWT Bearer (`JWT-auth`)

Header HTTP estándar:

```http
Authorization: Bearer <access_token>
```

Obtenido mediante `POST /api/auth/login` o el flujo BFF OAuth.

### 2. Cookie de sesión (`cookie-auth`)

Cookie HTTP-only con el access token. Usada por el dashboard frontend.

```http
Cookie: access_token=<jwt>
```

Los endpoints protegidos aceptan **indistintamente** Bearer o cookie (DualAuthGuard).

### 3. Widget API Key (`api-key`)

Header HTTP personalizado para el chat widget (autenticación de visitantes):

```http
X-API-Key: <api_key>
```

Se crea con `POST /api/api-keys` y se firma con RSA 4096 + JWKS publicado en `/jwks`.

### 4. Integration API Key (`x-api-key`)

Header HTTP para integraciones **server-to-server** de backends externos:

```http
x-api-key: gdr_live_<32hex>
```

Se crea con `POST /api/integration-api-keys` (requiere JWT Bearer de admin). Solo
el hash SHA-256 se almacena en base de datos; el token en claro se devuelve
**una única vez** al momento de la creación. Entorno sandbox usa prefijo `gdr_test_xxx`.

> **Nota**: Existen endpoints públicos (login, register, tracking-v2 events,
> health, JWKS, root) que no requieren ninguno de los tres esquemas. Están
> marcados con `security: []` en el OpenAPI.

## Uso recomendado

### Generar cliente TypeScript con openapi-typescript

```bash
npx openapi-typescript docs/api/openapi.yaml -o src/api-types.ts
```

### Generar cliente con OpenAPI Generator

```bash
npx @openapitools/openapi-generator-cli generate \
  -i docs/api/openapi.yaml \
  -g typescript-axios \
  -o ./generated-client
```

### Visualizar con Redoc

```bash
npx @redocly/cli preview-docs docs/api/openapi.yaml
```

### Importar en Postman / Insomnia

Ambas herramientas soportan importar `openapi.yaml` o `openapi.json`
directamente desde el menú **File → Import**.

## Regeneración del contrato

El contrato se regenera desde el código fuente del backend con:

```bash
npm run openapi:generate   # produce docs/api/openapi.{json,yaml}
npm run openapi:lint       # valida con Redocly
```

El script `scripts/generate-openapi.ts` levanta el `AppModule` sin arrancar el
servidor HTTP (usando SQLite y MongoDB en memoria) y extrae el documento con
la configuración central en
`src/context/shared/infrastructure/swagger/swagger.config.ts`.

## Validación

El contrato se valida con [Redocly CLI](https://redocly.com/docs/cli/) usando
las reglas en `redocly.yaml`. El estado actual es:

- ✅ **0 errores**
- ✅ **0 warnings**

Dos reglas están deliberadamente desactivadas (documentado en `redocly.yaml`):

- `nullable-type-sibling`: NestJS Swagger v11 emite el idiom estándar
  `{ allOf: [{$ref}], nullable: true }` que Redocly estricto rechaza pero es
  aceptado por el ecosistema (Swagger UI, todos los codegens).
- `operation-2xx-response`: los 5 endpoints `bff-auth` responden únicamente
  con redirects 302 (flujo OAuth). Redocly v2 no soporta overrides por path
  para esta regla.

## Versionado y breaking changes

La versión del contrato se toma de `package.json`. Cada regeneración actualiza
`info.version` en `openapi.json` y `openapi.yaml`.

### Política de versionado

- **Patch** (`0.0.x`): cambios no-breaking (nuevos endpoints opcionales,
  campos opcionales añadidos a responses).
- **Minor** (`0.x.0`): nuevos recursos, nuevas operaciones requeridas.
- **Major** (`x.0.0`): rename de paths, remove de campos, cambios de tipo.

### Changelog breaking

| Versión | Cambio                                                           |
| ------- | ---------------------------------------------------------------- |
| 0.0.1   | Contrato inicial publicado                                       |
| 0.0.1   | Rename `GET /api/v2/chats/commercial/:id` → `GET /api/v2/commercials/:id/chats` |
| 0.0.1   | Rename `GET /api/v2/chats/visitor/:id` → `GET /api/v2/visitors/:id/chats` |
| 0.0.1   | Remove duplicado `POST /api/sites/resolve` (usar el de `sites` tag) |

## Soporte

- **Documentación Swagger UI en vivo**: `https://api.guiders.ai/docs`
- **Contrato OpenAPI JSON en vivo**: `https://api.guiders.ai/docs-json`
- **JWKS**: `https://api.guiders.ai/jwks`

Para preguntas o issues sobre el contrato, abrir issue en el repositorio
`guiders-backend`.
