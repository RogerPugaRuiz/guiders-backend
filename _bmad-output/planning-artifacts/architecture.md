---
stepsCompleted:
  [
    step-01-init,
    step-02-context,
    step-03-starter,
    step-04-decisions,
    step-05-patterns,
    step-06-structure,
    step-07-validation,
    step-08-complete,
  ]
status: complete
completedAt: '30/03/2026'
inputDocuments:
  - _bmad-output/product-brief.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/adr-001-ddd-cqrs.md
  - _bmad-output/planning-artifacts/adr-002-dual-persistence.md
  - CLAUDE.md
workflowType: 'architecture'
project_name: 'guiders-backend'
user_name: 'Roger Puga'
date: '30/03/2026'
---

# Architecture Decision Document

_Este documento se construye de forma colaborativa paso a paso. Las secciones se van añadiendo a medida que tomamos cada decisión arquitectónica juntos._

## Análisis de Contexto del Proyecto

### Resumen de Requisitos

**Requisitos Funcionales:**

- **RF-01 — Top páginas del visitante**: Agregación MongoDB de eventos `PAGE_VIEW` por visitante → top 5 URLs con conteo de visitas. Se añade campo `topPages` a `GetVisitorActivityResponseDto`. Nuevo método `getTopPagesByVisitor` en `TrackingEventRepository`. Sin nuevo endpoint — se extiende `get-visitor-activity`.

- **RF-02 — Registro de lead**: Nuevo `RegisterVisitorLeadCommand` en `visitors-v2`. Transición de lifecycle del visitante a estado `LEAD` al registrar nombre, email y teléfono. Emite `VisitorLeadRegisteredEvent`.

- **RF-03 — Sync asíncrono a Leadcars**: Event handler `SyncLeadToLeadcarsOnVisitorLeadRegisteredEventHandler`. Patrón fire-and-forget con 1 retry automático. Timeout máximo 3s. Nuevo contexto `leadcars` en infrastructure con cliente HTTP.

- **RF-04 — Estado de sincronización**: Campo `sync_status: pending | synced | failed` en el modelo de lead. Log de intentos de sync. La respuesta del API refleja el estado de sync de forma explícita.

- **RF-05 — Config Leadcars por tenant**: Campo `leadcarsApiKey` en contexto `company` (PostgreSQL). Endpoint de verificación de conexión. Scope por tenant (companyId → apiKey).

**Requisitos No Funcionales:**

- Latencia `GET /visitor-activity`: ≤ 200ms p95, overhead de agregación top páginas ≤ +100ms
- Sync Leadcars: no bloqueante, timeout 3s, 1 retry automático, fiabilidad ≥ 99%
- Resiliencia: fallo de Leadcars no afecta el flujo de registro de lead en guiders
- Seguridad: `leadcarsApiKey` nunca expuesta en responses de API

**Escala y Complejidad:**

- Dominio primario: backend API + event-driven integration
- Nivel de complejidad: **alto** (brownfield, multi-tenant, integración externa)
- Componentes arquitectónicos afectados: ~5 módulos

### Restricciones Técnicas y Dependencias

- **Brownfield**: todas las features deben integrarse con contratos de API existentes sin romper cambios (backward compatible)
- **DDD/CQRS**: patrón obligatorio — commands, events, handlers, repositories
- **Dual persistence existente**: tracking → MongoDB, company/auth → PostgreSQL
- **Multi-tenant existente**: `companyId` como unidad de aislamiento de datos
- **Leadcars API**: integración externa con cliente HTTP por implementar

### Preocupaciones Transversales Identificadas

1. **Multi-tenancy en integración externa** — resolver `companyId` → `leadcarsApiKey` en el handler de sync
2. **Resiliencia de integración** — manejo de fallos de Leadcars sin afectar flujo principal
3. **Observabilidad de sync** — estado del lead (`sync_status`) + logs de intentos
4. **Seguridad de secretos** — `leadcarsApiKey` almacenada de forma segura, nunca expuesta en responses
5. **Performance de agregación** — índice MongoDB compuesto para `getTopPagesByVisitor`
6. **Consistencia eventual** — sync Leadcars es asíncrona; diseñar para que el estado sea eventualmente consistente

## Stack de Referencia (Brownfield)

Este es un proyecto brownfield. No se inicializa un starter template nuevo —
se extiende el codebase NestJS v11 existente en producción.

**Stack consolidado:**

- Runtime: Node.js + TypeScript
- Framework: NestJS v11 con `@nestjs/cqrs`
- Persistencia: TypeORM (PostgreSQL) + Mongoose (MongoDB)
- Tiempo real: Socket.IO v4.8.1
- Auth: JWT + Passport
- Testing: Jest (unit, integration, e2e)
- Linting/Format: ESLint + Prettier

**Decisiones de arquitectura base:** ADR-001 (DDD/CQRS) + ADR-002 (Dual Persistence)

## Decisiones Arquitectónicas Core

### Decisiones ya existentes (brownfield — no rediscutidas)

| Área              | Decisión                                             | Referencia |
| ----------------- | ---------------------------------------------------- | ---------- |
| Patrón de dominio | DDD/CQRS (`@nestjs/cqrs`)                            | ADR-001    |
| Persistencia      | PostgreSQL (TypeORM) + MongoDB (Mongoose)            | ADR-002    |
| Error handling    | `Result<T, E>` — sin excepciones en flujos esperados | CLAUDE.md  |
| Auth              | JWT + Passport                                       | Existente  |
| API               | REST + WebSocket (Socket.IO v4.8.1)                  | Existente  |
| HTTP client       | `@nestjs/axios`                                      | Existente  |

### Nuevas decisiones — Epic 2 + Epic 5

#### DA-01 — Retry de sync a Leadcars: BullMQ

**Decisión:** Usar BullMQ (`@nestjs/bull`) para gestionar los intentos de sync a Leadcars. El event handler `SyncLeadToLeadcarsOnVisitorLeadRegisteredEventHandler` encola un job en lugar de hacer la llamada HTTP directamente.

**Rationale:** Redis ya está en el stack. BullMQ aporta persistencia de cola, retry con backoff configurable, visibilidad de jobs fallidos y reintentos desacoplados del flujo principal. Un in-handler retry con `setTimeout` no sobrevive a reinicios del proceso.

**Implicaciones:**

- Añadir dependencias: `@nestjs/bull`, `bull`
- `LeadcarsModule` registra `BullModule.registerQueue({ name: 'leadcars-sync' })`
- Nuevo `LeacarsSyncProcessor` (`@Processor('leadcars-sync')`)
- Jobs con `attempts: 2`, `backoff: { type: 'fixed', delay: 3000 }`
- Estado `sync_status` en el Lead se actualiza desde el processor

#### DA-02 — Almacenamiento de `leadcarsApiKey`: campo encriptado en PostgreSQL

**Decisión:** Columna `leadcars_api_key VARCHAR` en la tabla `company`, encriptada en reposo mediante AES-256 con una clave de entorno `ENCRYPTION_KEY`. El cifrado/descifrado ocurre en el mapper de infraestructura, invisible para el dominio.

**Rationale:** Protege las API keys si la BD se filtra sin introducir complejidad de infra externa (Secrets Manager queda para fases futuras). El dominio nunca conoce el valor en crudo — solo trabaja con el value object `LeadcarsApiKey`.

**Implicaciones:**

- Helper `EncryptionService` en `shared/infrastructure/` usando `crypto` de Node.js
- Variable de entorno `ENCRYPTION_KEY` (32 bytes, hex)
- Migración TypeORM: `ALTER TABLE company ADD COLUMN leadcars_api_key VARCHAR`
- Value object `LeadcarsApiKey` en `company/domain/value-objects/`
- `LeadcarsApiKey` NUNCA serializada en responses de API

#### DA-03 — Modelo de lead: agregado `Lead` separado en `visitors-v2`

**Decisión:** Nueva colección MongoDB `leads` con su propio agregado `Lead`, schema Mongoose `LeadMongoEntity`, repositorio `LeadRepository`, y mapper `LeadMapper`. Vive en `visitors-v2` por cohesión de dominio.

**Rationale:** El lead tiene su propio ciclo de vida (`pending | synced | failed`), campos propios (nombre, email, teléfono, sync_status, intentos) y comportamiento independiente del `Visitor`. Mezclar en el documento de visitor viola la separación de responsabilidades y complica las queries de sync.

**Implicaciones:**

- `LeadId`, `LeadSyncStatus` como value objects en `visitors-v2/domain/`
- `VisitorLeadRegisteredEvent` emitido por el command handler
- `LeadRepository` con métodos: `save`, `findById`, `findPendingSync`
- Schema Mongoose con índice en `{ visitorId: 1, syncStatus: 1 }`

#### DA-04 — Integración Leadcars: nuevo contexto `src/context/leadcars/`

**Decisión:** Nuevo contexto DDD `src/context/leadcars/` con estructura estándar. Contiene el cliente HTTP, DTOs de integración, el BullMQ processor y el módulo.

**Rationale:** Sigue el patrón arquitectónico existente. Aisla la lógica de integración con Leadcars — si en el futuro se añaden HubSpot o Salesforce, cada uno tiene su propio contexto con el mismo patrón.

**Estructura:**

```
src/context/leadcars/
├── application/
│   └── processors/        # LeacarsSyncProcessor (BullMQ)
├── domain/
│   └── ports/             # LeadcarsClientPort (interfaz)
└── infrastructure/
    ├── http/              # LeadcarsHttpService (@nestjs/axios)
    ├── dtos/              # CreateLeadcarsLeadDto, LeadcarsResponseDto
    └── leadcars.module.ts
```

### Análisis de impacto de decisiones

**Secuencia de implementación dictada por dependencias:**

1. `EncryptionService` en shared (bloquea DA-02)
2. Migración TypeORM `leadcars_api_key` en company (bloquea DA-02)
3. Agregado `Lead` + repositorio en visitors-v2 (bloquea DA-03)
4. Contexto `leadcars` con cliente HTTP (bloquea DA-04)
5. BullMQ queue + processor (bloquea DA-01, depende de DA-03 + DA-04)
6. MongoDB aggregation `getTopPagesByVisitor` en tracking-v2 (independiente)

**Dependencias cruzadas entre contextos:**

- `leadcars` context necesita leer `leadcarsApiKey` de `company` context
- El processor de `leadcars` actualiza `syncStatus` del `Lead` en `visitors-v2`
- El evento `VisitorLeadRegisteredEvent` cruza de `visitors-v2` hacia `leadcars`

## Patrones de Implementación & Reglas de Consistencia

> Los patrones base del proyecto están en `CLAUDE.md`.
> Esta sección documenta patrones específicos de las features Epic 2 + Epic 5.

### Patrones de nombrado — nuevos elementos

**Value Objects nuevos:**

- `LeadcarsApiKey` (no `LeadcarsKey`, no `ApiKey`)
- `LeadSyncStatus` (no `SyncStatus`, no `LeadStatus`)
- `LeadId` (sigue convención `<Aggregate>Id`)

**Eventos de dominio:**

- `VisitorLeadRegisteredEvent` — evento emitido por `RegisterVisitorLeadCommandHandler`
- Naming: `<Entidad><Acción>Event` → `VisitorLeadRegisteredEvent`, no `LeadCreatedEvent`

**Event Handler cross-context:**

- `SyncLeadToLeadcarsOnVisitorLeadRegisteredEventHandler`
- Patrón obligatorio: `<Acción>On<Evento>EventHandler` — sin excepción

**BullMQ:**

- Nombre del queue: `'leadcars-sync'` (kebab-case, string constante exportada)
- Processor: `LeadcarsSyncProcessor`
- Job data type: `LeadcarsSyncJobDto` (DTO tipado, nunca `any`)

**Endpoints nuevos:**

- `POST /visitors/:visitorId/register-lead` — registro de lead
- `POST /company/leadcars/verify` — verificación de conexión Leadcars

### Patrones de formato — respuestas de API

**Respuesta `POST /visitors/:id/register-lead`:**

```json
{
  "success": true,
  "data": {
    "leadId": "uuid",
    "syncStatus": "pending"
  },
  "message": "Lead registrado. Sincronización con Leadcars pendiente."
}
```

- `syncStatus` siempre presente — nunca omitir
- Valores válidos: `"pending" | "synced" | "failed"` — exactamente estos strings

**Campo `topPages` en `GetVisitorActivityResponseDto`:**

```json
{
  "topPages": [
    { "url": "/gama/suv/kuga", "visits": 4 },
    { "url": "/financiacion", "visits": 2 }
  ]
}
```

- Array vacío `[]` si no hay datos — nunca `null`
- Máximo 5 elementos — aplicado en la agregación MongoDB, no en el mapper

### Patrones de proceso — integración externa

**Patrón de llamada HTTP a Leadcars (en el processor):**

```typescript
// ✅ CORRECTO
const result = await this.leadcarsClient.createLead(dto);
if (result.isErr()) {
  await this.leadRepository.updateSyncStatus(leadId, LeadSyncStatus.failed());
  return; // no lanzar excepción — Bull gestiona el retry
}
await this.leadRepository.updateSyncStatus(leadId, LeadSyncStatus.synced());

// ❌ INCORRECTO
throw new Error('Leadcars failed'); // no usar excepciones para controlar retry
```

**Encriptación en mapper (patrón para `leadcarsApiKey`):**

```typescript
// En CompanyMapper.toPersistence():
leadcarsApiKey: entity.leadcarsApiKey
  ? this.encryptionService.encrypt(entity.leadcarsApiKey.value)
  : null,

// En CompanyMapper.fromPersistence():
leadcarsApiKey: raw.leadcars_api_key
  ? LeadcarsApiKey.create(this.encryptionService.decrypt(raw.leadcars_api_key))
  : null,
```

- El cifrado/descifrado NUNCA ocurre fuera del mapper
- `leadcarsApiKey` NUNCA en logs — usar `'[REDACTED]'` si es necesario

**Pipeline MongoDB `getTopPagesByVisitor`:**

```typescript
// Índice requerido (crear antes de desplegar):
{ visitorId: 1, eventType: 1 }

// Pipeline:
[
  { $match: { visitorId, eventType: 'PAGE_VIEW' } },
  { $group: { _id: '$url', visits: { $sum: 1 } } },
  { $sort: { visits: -1 } },
  { $limit: 5 },
  { $project: { url: '$_id', visits: 1, _id: 0 } }
]
```

### Reglas de enforcement para agentes IA

**Los agentes DEBEN:**

- Añadir `commit()` después de `mergeObjectContext` en TODOS los command handlers
- Usar `LeadSyncStatus` como value object — no strings directos en el dominio
- El processor de BullMQ devuelve `void` — actualiza estado vía repositorio
- Crear el índice MongoDB antes de desplegar la query

**Los agentes NO DEBEN:**

- Serializar `leadcarsApiKey` en ningún DTO de response ni en logs
- Lanzar excepciones dentro del processor para controlar el flujo de retry
- Acceder a la BD de `company` desde el contexto `leadcars` directamente — usar un query dedicado

## Estructura del Proyecto & Límites

### Mapeo de requisitos a componentes

| Requisito                 | Contexto                      | Tipo de cambio             |
| ------------------------- | ----------------------------- | -------------------------- |
| RF-01 — Top páginas       | `tracking-v2` + `visitors-v2` | Extensión                  |
| RF-02 — Registro lead     | `visitors-v2`                 | Nuevo agregado + command   |
| RF-03 — Sync Leadcars     | `leadcars` (nuevo)            | Nuevo contexto             |
| RF-04 — Estado sync       | `visitors-v2`                 | Nuevo value object         |
| RF-05 — Config por tenant | `company` + `shared`          | Extensión + nuevo servicio |

### Archivos nuevos a crear

```
src/
├── context/
│   ├── shared/
│   │   └── infrastructure/
│   │       └── encryption/
│   │           └── encryption.service.ts
│   │
│   ├── company/
│   │   └── domain/
│   │       └── value-objects/
│   │           └── leadcars-api-key.ts
│   │
│   ├── visitors-v2/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── lead.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── lead-id.ts
│   │   │   │   └── lead-sync-status.ts
│   │   │   ├── events/
│   │   │   │   └── visitor-lead-registered.event.ts
│   │   │   └── repositories/
│   │   │       └── lead.repository.ts
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   └── register-visitor-lead/
│   │   │   │       ├── register-visitor-lead.command.ts
│   │   │   │       └── register-visitor-lead.command-handler.ts
│   │   │   └── dtos/
│   │   │       └── register-visitor-lead.dto.ts
│   │   └── infrastructure/
│   │       └── persistence/
│   │           ├── mongo-lead.entity.ts
│   │           ├── mongo-lead.repository.impl.ts
│   │           └── lead.mapper.ts
│   │
│   └── leadcars/
│       ├── application/
│       │   ├── events/
│       │   │   └── sync-lead-to-leadcars-on-visitor-lead-registered.event-handler.ts
│       │   ├── processors/
│       │   │   └── leadcars-sync.processor.ts
│       │   └── dtos/
│       │       └── leadcars-sync-job.dto.ts
│       ├── domain/
│       │   └── ports/
│       │       └── leadcars-client.port.ts
│       └── infrastructure/
│           ├── http/
│           │   └── leadcars-http.service.ts
│           ├── dtos/
│           │   ├── create-leadcars-lead.dto.ts
│           │   └── leadcars-response.dto.ts
│           └── leadcars.module.ts
│
└── migrations/
    └── YYYYMMDD-add-leadcars-api-key-to-company.ts
```

### Archivos existentes a modificar

| Archivo                                                             | Cambio                                                          |
| ------------------------------------------------------------------- | --------------------------------------------------------------- |
| `tracking-v2/.../mongo-tracking-event.repository.impl.ts`           | Implementar `getTopPagesByVisitor` con pipeline de agregación   |
| `tracking-v2/.../tracking-event.repository.ts`                      | Añadir firma `getTopPagesByVisitor` a la interfaz               |
| `visitors-v2/.../get-visitor-activity.query-handler.ts`             | Llamar `getTopPagesByVisitor`, añadir `topPages` al resultado   |
| `visitors-v2/application/dtos/get-visitor-activity-response.dto.ts` | Añadir campo `topPages: { url: string; visits: number }[]`      |
| `visitors-v2/.../visitors-v2.controller.ts`                         | Nuevo endpoint `POST /visitors/:id/register-lead`               |
| `company/.../company.entity.ts` (TypeORM)                           | Añadir columna `leadcars_api_key VARCHAR`                       |
| `company/.../company.mapper.ts`                                     | Encriptar/desencriptar `leadcarsApiKey` vía `EncryptionService` |
| `app.module.ts`                                                     | Importar `LeadcarsModule`, `BullModule.forRoot(...)`            |

### Límites de integración

**Flujo — Registro de lead + sync Leadcars:**

```
POST /visitors/:id/register-lead
  → RegisterVisitorLeadCommandHandler (visitors-v2)
    → Lead.create() → VisitorLeadRegisteredEvent
    → LeadRepository.save() → commit()
      → SyncLeadToLeadcarsOnVisitorLeadRegisteredEventHandler (leadcars)
        → enqueue job 'leadcars-sync'
          → LeadcarsSyncProcessor
            → GetLeadcarsApiKeyQuery(companyId)   ← cross-context read
            → LeadcarsHttpService.createLead()
            → LeadRepository.updateSyncStatus()
```

**Flujo — Top páginas del visitante:**

```
GET /visitors/:id/activity
  → GetVisitorActivityQueryHandler (visitors-v2)
    → [datos existentes del visitante]
    → TrackingEventRepository.getTopPagesByVisitor(visitorId)
    → merge → GetVisitorActivityResponseDto { ...existing, topPages }
```

**Comunicación cross-context:**

- `leadcars` → `company`: solo lectura mediante `QueryBus.execute(GetLeadcarsApiKeyQuery)` — nunca acceso directo al repositorio
- `leadcars` → `visitors-v2`: `LeadRepository` inyectado en el processor vía importación del submódulo de persistencia

### Variables de entorno nuevas

```
ENCRYPTION_KEY=<32 bytes hex>   # Requerida para DA-02 (leadcarsApiKey encriptada)
```

## Validación de Arquitectura

### Resultado: LISTA PARA IMPLEMENTACIÓN ✅

**Coherencia:** Todas las decisiones son compatibles entre sí.
**Cobertura:** Todos los RF y NFR tienen soporte arquitectónico.
**Preparación:** Los agentes IA tienen suficiente detalle para implementar consistentemente.

### Gaps resueltos durante validación

**Gap-01 — Query cross-context para `leadcarsApiKey`:**

Añadir a archivos nuevos:

- `company/application/queries/get-leadcars-api-key/get-leadcars-api-key.query.ts`
- `company/application/queries/get-leadcars-api-key/get-leadcars-api-key.query-handler.ts`

**Gap-02 — Endpoint de verificación de conexión Leadcars:**

Añadir a archivos modificados/nuevos:

- `company/.../company.controller.ts` — `POST /company/leadcars/verify`
- `company/application/commands/verify-leadcars-connection/` — command + handler

**Gap-03 — Índice MongoDB en colección `leads`:**

El schema `LeadMongoEntity` debe incluir:

```typescript
@Schema({ collection: 'leads' })
@index({ visitorId: 1, syncStatus: 1 })
export class LeadMongoEntity { ... }
```

### Checklist de completitud

- [x] Análisis de contexto completo
- [x] Stack de referencia documentado (brownfield)
- [x] Decisiones críticas documentadas (DA-01 a DA-04)
- [x] Patrones de implementación definidos
- [x] Estructura de archivos mapeada (nuevos + modificados)
- [x] Flujos de integración cross-context documentados
- [x] Variables de entorno nuevas identificadas
- [x] Gaps identificados y resueltos

### Orden de implementación recomendado

1. `EncryptionService` en shared
2. Migración TypeORM + `LeadcarsApiKey` VO en company
3. `GetLeadcarsApiKeyQuery` en company
4. `Lead` aggregate + `LeadRepository` en visitors-v2
5. `RegisterVisitorLeadCommand` + handler + endpoint
6. Contexto `leadcars` completo (port + HTTP service + module)
7. `LeadcarsSyncProcessor` + BullMQ queue
8. `SyncLeadToLeadcarsOnVisitorLeadRegisteredEventHandler`
9. `getTopPagesByVisitor` en tracking-v2 + extensión del DTO _(puede ir en paralelo a los pasos 1-8)_
