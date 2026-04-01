# Historia 4.1: Corregir Tipos y Request de Crear Lead

Status: done

## Historia

Como desarrollador,
quiero que los tipos en `leadcars.types.ts` y el mapeo en `leadcars-crm-sync.adapter.ts` coincidan exactamente con la API real de LeadCars v2.4,
para que la sincronización de leads no falle por nombres de campos incorrectos o tipos de datos erróneos.

## Criterios de Aceptación

1. **Dado** el tipo `LeadcarsCreateLeadRequest`
   **Cuando** se construye un request para `POST /leads`
   **Entonces** los campos enviados son exactamente: `nombre`, `apellidos`, `email`, `telefono`, `movil`, `cp`, `provincia`, `comentario`, `url_origen`, `concesionario` (número), `sede` (número), `tipo_lead` (número), `campana` (string) + campos dinámicos al nivel raíz
   **Y** no existen campos `origen_lead`, `datos_adicionales`, `observaciones`, `concesionario_id`, `sede_id`, `campana_id`, `dni`, `poblacion`

2. **Dado** `LeadcarsTipoLead` (string enum) y `LeadcarsOrigenLead`
   **Cuando** se compilan los tipos
   **Entonces** ambos tipos han sido eliminados del código
   **Y** `tipo_lead` es un `number` (ID numérico de `GET /tipos`)

3. **Dado** la config de LeadCars con `tipoLeadDefault: 7` (número)
   **Cuando** se valida la configuración en `validateConfig()`
   **Entonces** la validación acepta cualquier número positivo como `tipoLeadDefault`
   **Y** no valida contra un enum de strings

4. **Dado** datos de contacto con campo `poblacion`
   **Cuando** se construye el request para LeadCars
   **Entonces** el valor se mapea al campo `provincia` de la API

5. **Dado** la llamada a `listCampanas` con `concesionarioId: 123`
   **Cuando** se ejecuta la petición HTTP
   **Entonces** la URL es `/campanas/123` (con el ID como parámetro de ruta)

6. **Dado** datos adicionales de Guiders (visitor_id, company_id)
   **Cuando** se incluyen en el request
   **Entonces** se envían como campos dinámicos al nivel raíz: `guiders_visitor_id`, `guiders_company_id`
   **Y** NO se envían dentro de un objeto `datos_adicionales`

7. **Dado** `LeadcarsConfig`
   **Cuando** se usa en el adapter
   **Entonces** `tipoLeadDefault` es `number` (no `string`)
   **Y** existe `campanaCode?: string` (no `campanaId: number`)

## Tareas / Subtareas

- [x] Actualizar `leadcars.types.ts` — tipos del request (AC: 1, 2, 7)
  - [x] Modificar `LeadcarsCreateLeadRequest`: renombrar `concesionario_id` → `concesionario`, `sede_id` → `sede`, `campana_id` → `campana: string`, `tipo_lead: LeadcarsTipoLead` → `tipo_lead: number`
  - [x] Eliminar campos: `origen_lead`, `datos_adicionales`, `observaciones`, `dni`, `poblacion`
  - [x] Añadir campos: `movil?: string`, `cp?: string`, `provincia?: string`, `comentario?: string`, `url_origen?: string`
  - [x] Añadir index signature: `[key: string]: unknown` para campos dinámicos al nivel raíz
  - [x] Eliminar tipo `LeadcarsTipoLead` (string enum)
  - [x] Eliminar tipo `LeadcarsOrigenLead`
  - [x] Modificar `LeadcarsConfig`: `tipoLeadDefault: string` → `tipoLeadDefault: number`, `campanaId?: number` → `campanaCode?: string`
- [x] Actualizar `leadcars-crm-sync.adapter.ts` — buildCreateLeadRequest (AC: 1, 3, 4, 6, 7)
  - [x] Actualizar imports: eliminar `LeadcarsTipoLead` del import
  - [x] Actualizar `buildCreateLeadRequest()`: usar nuevos nombres de campos
  - [x] Mapear `poblacion` → `provincia` (AC: 4)
  - [x] Mapear `dni` → eliminar (no existe en la API real)
  - [x] Mapear `additionalData` + `guiders_*` como campos al nivel raíz (AC: 6)
  - [x] Usar `comentario` en lugar de `observaciones`
  - [x] Usar `config.campanaCode` (string) en lugar de `config.campanaId` (número)
  - [x] Actualizar `validateConfig()`: eliminar validación contra string enum (AC: 3)
  - [x] Actualizar `extractLeadcarsConfig()`: usar nuevos nombres de campos del config
- [x] Actualizar `leadcars-api.service.ts` — listCampanas (AC: 5)
  - [x] Añadir parámetro `concesionarioId: number` a `listCampanas()`
  - [x] Cambiar URL: `/campanas` → `/campanas/${concesionarioId}`
  - [x] Actualizar todas las llamadas a `listCampanas()` en el codebase (buscar en controllers/admin)
- [x] Actualizar `LeadcarsApiService.addChatConversation()` — firma compatible con Story 4.2
  - [x] Cambiar el tipo del parámetro `request` para aceptar la nueva estructura (preparar para Story 4.2)
- [x] Actualizar tests si existen (AC: todos)
  - [x] Verificar que `npm run test:unit -- src/context/leads` pasa sin errores

### Review Findings

- [x] [Review][Decision] tipoLeadDefault cambió de string a number sin migración de datos existentes — Resuelto: coerción runtime con validación explícita de tipo string legacy. [leadcars-crm-sync.adapter.ts:234]
- [x] [Review][Patch] Object.assign(request, additionalData) permite sobreescritura de campos críticos — Corregido: filtrado de keys protegidas con Set + logger warning. [leadcars-crm-sync.adapter.ts:305]
- [x] [Review][Patch] tipoLeadDefault permite floats — Corregido: añadido Number.isInteger() a validateConfig(). [leadcars-crm-sync.adapter.ts:225]
- [x] [Review][Patch] DTO crm-config.dto.ts NO actualizado — Corregido: campanaId→campanaCode (string), tipoLeadDefault→number. [crm-config.dto.ts:102-115]
- [x] [Review][Patch] concesionarioId=0 pasa validación — Corregido: añadido <= 0 al check. [leadcars-crm-sync.adapter.ts:216]
- [x] [Review][Patch] Fallback campanaCode no lee campanaId legacy — Corregido: añadido campanaId al fallback chain con conversión a string. [leadcars-crm-sync.adapter.ts:257]
- [x] [Review][Defer] Sin validación de concesionarioId en URL path [leadcars-api.service.ts:122] — deferred, pre-existing
- [x] [Review][Defer] email y apellidos requeridos por API v2.4 pero no validados/advertidos — deferred, pre-existing

## Notas de Desarrollo

### Estado actual vs. estado objetivo

**`LeadcarsCreateLeadRequest` — ANTES (incorrecto):**

```typescript
export interface LeadcarsCreateLeadRequest {
  nombre: string;
  apellidos?: string;
  email?: string;
  telefono?: string;
  dni?: string; // ❌ No existe en API real
  poblacion?: string; // ❌ Nombre incorrecto
  concesionario_id: number; // ❌ Nombre incorrecto
  sede_id?: number; // ❌ Nombre incorrecto
  campana_id?: number; // ❌ Tipo y nombre incorrectos
  tipo_lead: LeadcarsTipoLead; // ❌ Tipo incorrecto (debería ser number)
  origen_lead: LeadcarsOrigenLead; // ❌ No existe en API
  observaciones?: string; // ❌ Nombre incorrecto
  datos_adicionales?: Record<string, unknown>; // ❌ Estructura incorrecta
}
```

**`LeadcarsCreateLeadRequest` — DESPUÉS (correcto para API v2.4):**

```typescript
export interface LeadcarsCreateLeadRequest {
  nombre: string;
  apellidos?: string;
  email?: string;
  telefono?: string;
  movil?: string; // ✅ Nuevo campo E.164
  cp?: string; // ✅ Nuevo campo
  provincia?: string; // ✅ Renombrado de poblacion
  comentario?: string; // ✅ Renombrado de observaciones
  url_origen?: string; // ✅ Nuevo campo
  concesionario: number; // ✅ Corregido de concesionario_id
  sede?: number; // ✅ Corregido de sede_id
  tipo_lead: number; // ✅ Ahora es ID numérico
  campana?: string; // ✅ Ahora es código de texto
  [key: string]: unknown; // ✅ Campos dinámicos al nivel raíz
}
```

### `LeadcarsConfig` — cambios

```typescript
// ANTES:
export interface LeadcarsConfig {
  clienteToken: string;
  useSandbox: boolean;
  concesionarioId: number;
  sedeId?: number;
  campanaId?: number; // ❌ Número
  tipoLeadDefault: string; // ❌ String enum
}

// DESPUÉS:
export interface LeadcarsConfig {
  clienteToken: string;
  useSandbox: boolean;
  concesionarioId: number;
  sedeId?: number;
  campanaCode?: string; // ✅ Código de texto
  tipoLeadDefault: number; // ✅ ID numérico
}
```

### `buildCreateLeadRequest` — DESPUÉS

```typescript
private buildCreateLeadRequest(
  contactData: LeadContactDataPrimitives,
  config: LeadcarsConfig,
): LeadcarsCreateLeadRequest {
  const request: LeadcarsCreateLeadRequest = {
    nombre: contactData.nombre || 'Visitante',
    concesionario: config.concesionarioId,  // ✅ Nuevo nombre
    tipo_lead: config.tipoLeadDefault,       // ✅ Ya es número
    comentario: `Lead generado automáticamente desde chat de Guiders (visitor: ${contactData.visitorId})`,
  };

  if (contactData.apellidos) request.apellidos = contactData.apellidos;
  if (contactData.email) request.email = contactData.email;
  if (contactData.telefono) request.telefono = contactData.telefono;
  if (contactData.poblacion) request.provincia = contactData.poblacion; // ✅ Mapeado
  if (config.sedeId) request.sede = config.sedeId;  // ✅ Nuevo nombre
  if (config.campanaCode) request.campana = config.campanaCode;  // ✅ Código texto

  // Campos dinámicos al nivel raíz (no dentro de datos_adicionales)
  request['guiders_visitor_id'] = contactData.visitorId;  // ✅
  request['guiders_company_id'] = contactData.companyId;  // ✅
  if (contactData.additionalData) {
    Object.assign(request, contactData.additionalData);   // ✅
  }

  return request;
}
```

### `validateConfig` — DESPUÉS

```typescript
validateConfig(config: CrmCompanyConfigPrimitives): string[] {
  const errors: string[] = [];
  const leadcarsConfig = config.config as Partial<LeadcarsConfig>;

  if (!leadcarsConfig.clienteToken) errors.push('clienteToken es obligatorio');
  if (typeof leadcarsConfig.concesionarioId !== 'number') errors.push('concesionarioId es obligatorio y debe ser un número');
  if (leadcarsConfig.useSandbox === undefined) errors.push('useSandbox es obligatorio');
  if (typeof leadcarsConfig.tipoLeadDefault !== 'number' || leadcarsConfig.tipoLeadDefault <= 0) {
    errors.push('tipoLeadDefault es obligatorio y debe ser un número positivo (ID de GET /tipos)');
  }
  // ✅ Eliminada validación contra string enum

  return errors;
}
```

### `listCampanas` — DESPUÉS

```typescript
async listCampanas(
  concesionarioId: number,  // ✅ Nuevo parámetro requerido
  config: LeadcarsConfig,
): Promise<Result<LeadcarsListCampanasResponse, DomainError>> {
  const url = `${this.getBaseUrl(config)}/campanas/${concesionarioId}`; // ✅
  // ...
}
```

### Archivos a tocar

| Archivo                                                               | Acción                                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `leads/infrastructure/adapters/leadcars/leadcars.types.ts`            | Modificar (tipos del request, LeadcarsConfig)                             |
| `leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts` | Modificar (buildCreateLeadRequest, validateConfig, extractLeadcarsConfig) |
| `leads/infrastructure/adapters/leadcars/leadcars-api.service.ts`      | Modificar (listCampanas + parámetro)                                      |
| `leads/infrastructure/controllers/leads-admin.controller.ts`          | Verificar y actualizar llamada a listCampanas                             |

### Búsqueda de llamadas a listCampanas

Antes de modificar la firma, buscar todas las invocaciones:

```bash
grep -r "listCampanas" src/
```

Actualizar las llamadas en el controller admin que proxea campañas: el endpoint ya recibe `:concesionarioId` como parámetro de ruta.

### Impacto en CrmCompanyConfigSchema

El schema de MongoDB almacena `config` como objeto genérico `Record<string, unknown>`. Los cambios de nombre de campos en `LeadcarsConfig` **SÍ rompen datos existentes** en la base de datos si existen configs guardadas con `campanaId` (número). Estrategia: el `extractLeadcarsConfig()` debe ser tolerante y leer ambas versiones:

```typescript
private extractLeadcarsConfig(config: CrmCompanyConfigPrimitives): LeadcarsConfig {
  const rawConfig = config.config;
  return {
    clienteToken: rawConfig.clienteToken as string,
    useSandbox: rawConfig.useSandbox as boolean,
    concesionarioId: rawConfig.concesionarioId as number,
    sedeId: rawConfig.sedeId as number | undefined,
    campanaCode: (rawConfig.campanaCode || rawConfig.campana) as string | undefined, // compatibilidad
    tipoLeadDefault: rawConfig.tipoLeadDefault as number,
  };
}
```

### Orden recomendado de implementación

1. Primero actualizar `leadcars.types.ts` (tipos)
2. Luego `leadcars-crm-sync.adapter.ts` (lógica de mapeo)
3. Luego `leadcars-api.service.ts` (firma de listCampanas)
4. Finalmente el controller (pasar concesionarioId)

### Referencias

- Fuente de verdad: `docs/leadcar/LeadCars_API_V2_4.pdf`
- AGENTS.md leads — tabla de discrepancias: `src/context/leads/AGENTS.md`
- Tipos actuales: `src/context/leads/infrastructure/adapters/leadcars/leadcars.types.ts`
- Adapter actual: `src/context/leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts`
- API service actual: `src/context/leads/infrastructure/adapters/leadcars/leadcars-api.service.ts`
- Controller admin: `src/context/leads/infrastructure/controllers/leads-admin.controller.ts`
- Story 4.3 (teléfonos E.164) debe implementarse DESPUÉS de esta story

## Registro del Agente Dev

### Modelo Utilizado

claude-sonnet-4.6 (github-copilot/claude-sonnet-4.6)

### Notas de Completación

Implementación completada el 01/04/2026. Cambios realizados:

1. **`leadcars.types.ts`**: Eliminados `LeadcarsTipoLead` y `LeadcarsOrigenLead`. `LeadcarsConfig` actualizado: `campanaId: number` → `campanaCode?: string`, `tipoLeadDefault: string` → `tipoLeadDefault: number`. `LeadcarsCreateLeadRequest` reescrito según API v2.4: `concesionario_id` → `concesionario`, `sede_id` → `sede`, `campana_id` → `campana: string`, `tipo_lead` ahora es `number`; eliminados `origen_lead`, `datos_adicionales`, `observaciones`, `dni`, `poblacion`; añadidos `movil`, `cp`, `provincia`, `comentario`, `url_origen` y el index signature `[key: string]: unknown`.

2. **`leadcars-crm-sync.adapter.ts`**: Import de `LeadcarsTipoLead` eliminado. `buildCreateLeadRequest()` usa los nuevos nombres de campo, mapea `poblacion` → `provincia`, envía datos adicionales (`guiders_visitor_id`, `guiders_company_id`, `additionalData`) al nivel raíz en vez de dentro de `datos_adicionales`. `validateConfig()` ahora valida `tipoLeadDefault` como número positivo. `extractLeadcarsConfig()` lee `campanaCode` o `campana` por compatibilidad con datos existentes en BD.

3. **`leadcars-api.service.ts`**: `listCampanas()` ahora recibe `concesionarioId: number` como primer parámetro y construye la URL `/campanas/${concesionarioId}`.

4. **`leads-admin.controller.ts`**: `getLeadcarsConfigForCompany()` actualizado para usar `campanaCode` (con compatibilidad `campana`) y `tipoLeadDefault: number`. Llamada a `listCampanas()` actualizada para pasar `concesionarioIdNum` como primer argumento.

**Validaciones:**

- 0 errores TypeScript en todo el proyecto
- 0 errores ESLint en archivos modificados
- 6/6 tests unitarios del contexto leads pasan
- 1479/1497 tests totales pasan (sin regresiones)

### Lista de Ficheros

- `src/context/leads/infrastructure/adapters/leadcars/leadcars.types.ts` (modificado)
- `src/context/leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts` (modificado)
- `src/context/leads/infrastructure/adapters/leadcars/leadcars-api.service.ts` (modificado)
- `src/context/leads/infrastructure/controllers/leads-admin.controller.ts` (modificado)
