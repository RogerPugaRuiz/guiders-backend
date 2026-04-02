# Story 4.7: Soporte API LeadCars v2.5 — Estados y Temperatura

Status: done

## Story

Como desarrollador del contexto `leads`,
quiero actualizar el adaptador de LeadCars para soportar los nuevos campos y endpoint introducidos en la API v2.5,
de modo que la integración refleje fielmente la especificación oficial y permita enviar el estado y temperatura de un lead al crearlo o editarlo.

## Acceptance Criteria

1. **Nuevos tipos en `leadcars.types.ts`**

   - Existe el interface `LeadcarsEstado` con campos `id: string`, `motivos?: string[]`, `texto?: string`
   - Existe el interface `LeadcarsListStatesResponse` que modela la respuesta de `GET /listStates`
   - `LeadcarsCreateLeadRequest` tiene los campos opcionales `custom?`, `estado?` y `temperature?`
   - `LeadcarsCreateLeadRequest` ya NO tiene el index signature `[key: string]: unknown` en el raíz (los campos dinámicos van dentro de `custom`)
   - Existe el interface `LeadcarsEditLeadRequest` para `PUT /leads/{id}/submit` con `estado` (requerido), `temperature?` y los campos editables existentes
   - El comentario de versión en el archivo se actualiza a `v2.5`

2. **Nuevo método `listStates` en `LeadcarsApiService`**

   - El método `listStates(config)` llama a `GET /listStates` con el header `cliente-token`
   - Retorna `Promise<Result<LeadcarsListStatesResponse, DomainError>>`
   - Utiliza `executeWithRetry` igual que los demás métodos GET

3. **Nuevo método `editLead` en `LeadcarsApiService`**

   - El método `editLead(leadId, request, config)` llama a `PUT /leads/{leadId}/submit`
   - Retorna `Promise<Result<LeadcarsEditLeadResponse, DomainError>>`
   - Utiliza `executeWithRetry` con el método `put` privado

4. **Método `put` privado en `LeadcarsApiService`**

   - Existe el método privado `put<T>(url, data, config)` siguiendo el mismo patrón que `post`

5. **Proxy endpoint `GET /v1/leads/admin/leadcars/states`**

   - El endpoint existe en `leads-admin.controller.ts`
   - Requiere rol `admin`
   - Delega en `LeadcarsApiService.listStates()`
   - Devuelve la respuesta de LeadCars tal cual (igual que los demás proxies)

6. **Tests unitarios**
   - Tests para `listStates`: llamada correcta a `/listStates`, propagación de errores
   - Tests para `editLead`: llamada correcta a `/leads/{id}/submit`, campo `estado` presente
   - Tests para `LeadcarsCreateLeadRequest`: validar que `custom` existe y que el index signature ya no está en raíz
   - Todos los tests existentes siguen pasando (`npm run test:unit`)

## Tasks / Subtasks

- [x] **Task 1** — Actualizar tipos en `leadcars.types.ts` (AC: 1)

  - [x] 1.1 Añadir interface `LeadcarsEstado` con `id: string`, `motivos?: string[]`, `texto?: string`
  - [x] 1.2 Añadir type literal `LeadcarsTemperature = 'cold' | 'warn' | 'hot'`
  - [x] 1.3 Añadir interface `LeadcarsListStatesResponse`: mapa `{ [stateName: string]: { id: number; group: string; fields: LeadcarsStateField[] } }`
  - [x] 1.4 Añadir interface `LeadcarsStateField` con `name`, `type`, `title`, `required`, `options?`
  - [x] 1.5 Modificar `LeadcarsCreateLeadRequest`: añadir `custom?: Record<string, unknown>`, `estado?: LeadcarsEstado`, `temperature?: LeadcarsTemperature`; eliminar `[key: string]: unknown`
  - [x] 1.6 Añadir interface `LeadcarsEditLeadRequest` con `estado: LeadcarsEstado` (requerido), `temperature?: LeadcarsTemperature`, y campos opcionales: `nombre?`, `apellidos?`, `telefono?`, `cp?`, `provincia?`, `comentario?`, `url_origen?`, `concesionario?`, `sede?`, `campana?`
  - [x] 1.7 Añadir interface `LeadcarsEditLeadResponse` similar a `LeadcarsCreateLeadResponse`
  - [x] 1.8 Actualizar comentario de versión a `v2.5`

- [x] **Task 2** — Añadir método privado `put` y métodos públicos en `LeadcarsApiService` (AC: 2, 3, 4)

  - [x] 2.1 Implementar método privado `put<T>(url, data, config)` siguiendo el mismo patrón que `post`
  - [x] 2.2 Implementar `listStates(config)`: `GET /listStates` con `executeWithRetry`
  - [x] 2.3 Implementar `editLead(leadId, request, config)`: `PUT /leads/{leadId}/submit` con `executeWithRetry`
  - [x] 2.4 Actualizar imports en `leadcars-api.service.ts` para incluir los nuevos tipos

- [x] **Task 3** — Añadir endpoint proxy en `leads-admin.controller.ts` (AC: 5)

  - [x] 3.1 Añadir endpoint `GET /v1/leads/admin/leadcars/states` con decoradores `@Get('leadcars/states')`, `@UseGuards(...)`, `@Roles('admin')`
  - [x] 3.2 El handler obtiene la config LeadCars activa de la empresa (igual que los otros proxies) y delega en `LeadcarsApiService.listStates()`
  - [x] 3.3 Añadir `@ApiOperation` y `@ApiResponse` Swagger en español

- [x] **Task 4** — Tests unitarios (AC: 6)
  - [x] 4.1 Crear/ampliar tests de `LeadcarsApiService` en `__tests__/leadcars-api.service.spec.ts`
  - [x] 4.2 Test `listStates`: verifica que llama a `GET /listStates` con header `cliente-token` correcto
  - [x] 4.3 Test `listStates`: verifica propagación de errores via `CrmApiError`
  - [x] 4.4 Test `editLead`: verifica que llama a `PUT /leads/123/submit` con payload correcto
  - [x] 4.5 Test `editLead`: verifica que `estado` está presente en el payload
  - [x] 4.6 Ejecutar `npm run test:unit -- src/context/leads` y confirmar que todos pasan

### Review Findings

- [x] [Review][Patch] Inconsistencia de contrato entre `listStates` y `LeadcarsEstado.id` [src/context/leads/infrastructure/adapters/leadcars/leadcars.types.ts:23]
- [x] [Review][Patch] `editLead` acepta `leadId` inválidos y construye URLs erróneas [src/context/leads/infrastructure/adapters/leadcars/leadcars-api.service.ts:174]
- [x] [Review][Patch] Faltan tests para la migración a `custom` y la eliminación del index signature raíz exigidos por AC6 [src/context/leads/infrastructure/adapters/leadcars/__tests__/leadcars-api.service.spec.ts:1]
- [x] [Review][Defer] El flujo principal de creación aún no puede enviar `estado` ni `temperature` [src/context/leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts:266] — deferred, pre-existing. Razón: Fuera del alcance de la story 4.7; se abordará en una story separada para el flujo de creación end-to-end.

## Dev Notes

### Archivos a modificar

| Archivo                                                                      | Cambio                                                          |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `src/context/leads/infrastructure/adapters/leadcars/leadcars.types.ts`       | Añadir nuevos interfaces, modificar `LeadcarsCreateLeadRequest` |
| `src/context/leads/infrastructure/adapters/leadcars/leadcars-api.service.ts` | Añadir `put`, `listStates`, `editLead`                          |
| `src/context/leads/infrastructure/controllers/leads-admin.controller.ts`     | Añadir endpoint proxy `GET leadcars/states`                     |

### Archivos a crear

| Archivo                                                                                     | Propósito                         |
| ------------------------------------------------------------------------------------------- | --------------------------------- |
| `src/context/leads/infrastructure/adapters/leadcars/__tests__/leadcars-api.service.spec.ts` | Tests unitarios del servicio HTTP |

### Patrones a seguir

**Método privado `put` — seguir exactamente el mismo patrón que `post`:**

```typescript
private async put<T>(
  url: string,
  data: unknown,
  config: LeadcarsConfig,
): Promise<Result<T, DomainError>> {
  try {
    const axiosConfig: AxiosRequestConfig = {
      headers: this.getHeaders(config),
      timeout: 30000,
    };
    this.logger.debug(`PUT ${url}`, { data: this.sanitizeForLog(data) });
    const response = await firstValueFrom(
      this.httpService.put<T>(url, data, axiosConfig),
    );
    return ok(response.data);
  } catch (error) {
    return this.handleAxiosError(error, 'PUT', url);
  }
}
```

**Cambio en `LeadcarsCreateLeadRequest` — CRÍTICO:**

```typescript
// ANTES (v2.4):
export interface LeadcarsCreateLeadRequest {
  // ...campos fijos...
  [key: string]: unknown; // ← ELIMINAR ESTO
}

// DESPUÉS (v2.5):
export interface LeadcarsCreateLeadRequest {
  // ...campos fijos...
  custom?: Record<string, unknown>; // ← campos dinámicos van aquí
  estado?: LeadcarsEstado;
  temperature?: LeadcarsTemperature;
}
```

**IMPORTANTE:** Al eliminar `[key: string]: unknown` del interface, verificar si el adaptador `leadcars-crm-sync.adapter.ts` construye el request con campos dinámicos al nivel raíz. Si es así, moverlos a `custom`. Leer el archivo antes de modificar.

**Endpoint proxy en el controller — seguir el patrón existente de `listTipos`:**

```typescript
@Get('leadcars/states')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiOperation({ summary: 'Listar estados disponibles en LeadCars' })
async getLeadcarsStates(@CurrentUser() user: AuthUser) {
  // mismo patrón que getLeadcarsTipos
}
```

**Estructura de `LeadcarsListStatesResponse` — basada en la respuesta real de la API v2.5:**

```typescript
export interface LeadcarsStateField {
  name: string;
  type: 'checkbox' | 'text' | 'textarea' | string;
  title: string;
  required: boolean;
  options?: string[];
}

export interface LeadcarsStateItem {
  id: number;
  group: string;
  fields: LeadcarsStateField[];
}

export interface LeadcarsListStatesResponse {
  [stateName: string]: LeadcarsStateItem;
}
```

### Convenciones del proyecto

- Todos los comentarios en **español**
- Identificadores de código en **inglés**
- Usar `Result<T, E>` — nunca `throw` para errores esperados
- Tests con `jest.Mocked<T>` para dependencias
- UUIDs reales en tests: `Uuid.random().value`
- Describir bloques en español, lógica en inglés

### Verificación del adaptador antes de modificar el index signature

Antes de eliminar `[key: string]: unknown` de `LeadcarsCreateLeadRequest`, leer:

- `src/context/leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts`

Buscar si construye el payload con campos dinámicos fuera de `custom`. Si los hay, moverlos dentro de `custom: { ...camposDinamicos }`.

### Project Structure Notes

- La carpeta de tests del servicio debe crearse en `infrastructure/adapters/leadcars/__tests__/`
- El patrón de test para servicios HTTP usa `jest.spyOn` o mock de `HttpService`
- El controller sigue el patrón de `leads-admin.controller.ts` líneas 1-50 (guards, decoradores Swagger)

### Referencias

- [Source: LeadCars_API_V2_5.pdf — Changelog] — `[2.5] AÑADIDO: Funciones relativas a realizar cambios de estados en los leads`
- [Source: LeadCars_API_V2_5.pdf — POST /leads] — Nuevos campos: `custom`, `estado`, `temperature`
- [Source: LeadCars_API_V2_5.pdf — PUT /leads/{id}/submit] — Campo `estado` ahora requerido, añadido `temperature`
- [Source: LeadCars_API_V2_5.pdf — GET /listStates] — Nuevo endpoint, retorna mapa de estados con campos dinámicos
- [Source: src/context/leads/infrastructure/adapters/leadcars/leadcars.types.ts] — Tipos actuales a modificar
- [Source: src/context/leads/infrastructure/adapters/leadcars/leadcars-api.service.ts] — Servicio HTTP a ampliar
- [Source: src/context/leads/infrastructure/controllers/leads-admin.controller.ts] — Controller a ampliar
- [Source: src/context/leads/AGENTS.md] — Arquitectura, endpoints, patrones del contexto

## Dev Agent Record

### Agent Model Used

github-copilot/claude-sonnet-4.6

### Debug Log References

- Al eliminar `[key: string]: unknown` de `LeadcarsCreateLeadRequest`, se detectó que `leadcars-crm-sync.adapter.ts` usaba `request['guiders_visitor_id']`, `request['guiders_company_id']` y `request[key]` al nivel raíz. Estos campos se migraron al objeto `custom` correctamente.

### Completion Notes List

- ✅ **Task 1**: Añadidos 5 interfaces/types nuevos (`LeadcarsEstado`, `LeadcarsTemperature`, `LeadcarsStateField`, `LeadcarsStateItem`, `LeadcarsListStatesResponse`, `LeadcarsEditLeadRequest`, `LeadcarsEditLeadResponse`). Eliminado index signature de `LeadcarsCreateLeadRequest` y añadidos `custom`, `estado`, `temperature`. Comentario de versión actualizado a v2.5.
- ✅ **Task 1 (extra)**: Actualizado `leadcars-crm-sync.adapter.ts` para mover los campos dinámicos al nivel raíz dentro del objeto `custom` (compatibilidad con API v2.5).
- ✅ **Task 2**: Añadido método privado `put<T>`, método público `listStates` (GET /listStates) y `editLead` (PUT /leads/{id}/submit). Imports actualizados con nuevos tipos.
- ✅ **Task 3**: Añadido endpoint `GET /v1/leads/admin/leadcars/states` con guards, roles admin, Swagger en español. Sigue el mismo patrón que `getLeadcarsTipos`.
- ✅ **Task 4**: Creado `leadcars-api.service.spec.ts` con 6 tests para `listStates` y `editLead`. Resultado: `Tests: 12 passed, 12 total` (2 suites: nuevo + existente).

### File List

- `src/context/leads/infrastructure/adapters/leadcars/leadcars.types.ts` (modificado)
- `src/context/leads/infrastructure/adapters/leadcars/leadcars-api.service.ts` (modificado)
- `src/context/leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts` (modificado)
- `src/context/leads/infrastructure/controllers/leads-admin.controller.ts` (modificado)
- `src/context/leads/infrastructure/adapters/leadcars/__tests__/leadcars-api.service.spec.ts` (creado)
- `_bmad-output/implementation-artifacts/4-7-soporte-api-leadcars-v25-estados-y-temperatura.md` (este archivo)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modificado)

## Change Log

- 02/04/2026: Story implementada. Soporte completo API LeadCars v2.5: nuevos tipos, métodos `listStates`/`editLead`, endpoint proxy, tests unitarios. Campos dinámicos migrados a `custom` en adaptador CRM sync.
