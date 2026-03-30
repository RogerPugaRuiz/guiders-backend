---
stepsCompleted:
  [
    step-01-validate-prerequisites,
    step-02-design-epics,
    step-03-create-stories,
    step-04-final-validation,
  ]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/adr-001-ddd-cqrs.md
  - _bmad-output/planning-artifacts/adr-002-dual-persistence.md
---

# guiders-backend - Epic Breakdown

## Overview

Este documento proporciona el desglose completo de epics y stories para **guiders-backend**, descomponiendo los requisitos del PRD y la Arquitectura en stories implementables. Alcance: Epic 2 (intereses del visitante) + Epic 5 (integración Leadcars).

## Requirements Inventory

### Functional Requirements

FR-01: El sistema debe agregar eventos `PAGE_VIEW` por visitante en MongoDB y retornar las top 5 URLs más visitadas con su conteo de visitas, como parte de la respuesta de `GET /visitors/:id/activity`.

FR-02: El sistema debe añadir el campo `topPages: { url: string; visits: number }[]` a `GetVisitorActivityResponseDto`. Si no hay datos, devuelve array vacío `[]` (nunca `null`). Máximo 5 elementos.

FR-03: El sistema debe exponer un endpoint `POST /visitors/:id/register-lead` que acepte nombre, email y teléfono del visitante y registre un lead en `visitors-v2`.

FR-04: Al registrar un lead, el sistema debe transicionar el lifecycle del visitante al estado `LEAD` y emitir el evento `VisitorLeadRegisteredEvent`.

FR-05: El sistema debe sincronizar el lead a Leadcars de forma asíncrona (fire-and-forget), con 1 retry automático y timeout máximo de 3s, sin bloquear la respuesta del registro del lead.

FR-06: El sistema debe mantener el campo `sync_status: pending | synced | failed` en el agregado `Lead` y reflejarlo en la respuesta del API de registro de lead.

FR-07: La respuesta del endpoint `POST /visitors/:id/register-lead` debe incluir siempre `leadId` y `syncStatus` (nunca omitir).

FR-08: El sistema debe almacenar la `leadcarsApiKey` por empresa (tenant) en la tabla `company` de PostgreSQL, encriptada en reposo con AES-256.

FR-09: El sistema debe exponer un endpoint `POST /company/leadcars/verify` que valide la conexión con Leadcars usando la API key configurada para el tenant.

FR-10: La `leadcarsApiKey` nunca debe aparecer serializada en responses de API ni en logs del sistema.

FR-11: El sistema debe implementar `GetLeadcarsApiKeyQuery` para que el contexto `leadcars` pueda obtener la API key de `company` sin acceso directo al repositorio.

### NonFunctional Requirements

NFR-01: Latencia de `GET /visitors/:id/activity` ≤ 200ms p95. El overhead de la agregación top páginas no debe superar +100ms.

NFR-02: La sincronización a Leadcars debe ser no bloqueante. Timeout máximo 3s. 1 retry automático en fallo transitorio.

NFR-03: Fiabilidad de entrega de leads a Leadcars ≥ 99%. Los leads no deben perderse aunque Leadcars esté caído en el momento del registro.

NFR-04: Un fallo de Leadcars no debe afectar el flujo de registro de lead en guiders — el lead se registra siempre, el sync es eventual.

NFR-05: La `leadcarsApiKey` nunca debe ser expuesta en responses de API, logs, ni errores.

NFR-06: El retry de sync a Leadcars debe sobrevivir a reinicios del proceso (persistencia de cola).

### Additional Requirements

> Extraídos del documento de arquitectura — impactan la implementación de stories.

- **AR-01 (DA-01 — BullMQ):** Usar `@nestjs/bull` con BullMQ para gestionar el retry de sync. El event handler encola un job en lugar de hacer la llamada HTTP directamente. Queue: `'leadcars-sync'`, `attempts: 2`, `backoff: { type: 'fixed', delay: 3000 }`.

- **AR-02 (DA-02 — Encriptación):** `EncryptionService` en `shared/infrastructure/encryption/` usando `crypto` de Node.js con AES-256. La variable de entorno `ENCRYPTION_KEY` (32 bytes hex) es requerida. Cifrado/descifrado solo en el mapper — el dominio trabaja con el value object `LeadcarsApiKey`.

- **AR-03 (DA-03 — Agregado Lead separado):** El agregado `Lead` vive en `visitors-v2` como colección MongoDB independiente (`leads`), con sus propios value objects (`LeadId`, `LeadSyncStatus`) y repositorio. Índice en `{ visitorId: 1, syncStatus: 1 }`.

- **AR-04 (DA-04 — Nuevo contexto leadcars):** Crear `src/context/leadcars/` con estructura DDD estándar: `application/processors/`, `domain/ports/`, `infrastructure/http/`, `infrastructure/dtos/`, `leadcars.module.ts`.

- **AR-05 (Gap-01 — Query cross-context):** `GetLeadcarsApiKeyQuery` + handler en `company/application/queries/` para que el contexto `leadcars` lea la API key vía QueryBus sin acceso directo al repositorio de company.

- **AR-06 (Gap-02 — Verify endpoint):** `POST /company/leadcars/verify` con command + handler en `company/application/commands/verify-leadcars-connection/`.

- **AR-07 (Gap-03 — Índice MongoDB leads):** Schema `LeadMongoEntity` debe declarar `@index({ visitorId: 1, syncStatus: 1 })`.

- **AR-08 (Brownfield — sin breaking changes):** Todas las features deben integrarse con contratos de API existentes sin romper cambios. Extensión backward compatible de `GetVisitorActivityResponseDto`.

- **AR-09 (Orden de implementación):** Las dependencias dictan la secuencia: `EncryptionService` → migración TypeORM → `GetLeadcarsApiKeyQuery` → agregado `Lead` → command register-lead → contexto leadcars → BullMQ processor → event handler. La agregación top páginas puede ir en paralelo.

- **AR-10 (Variable de entorno nueva):** `ENCRYPTION_KEY=<32 bytes hex>` — debe documentarse en `.env.example` o equivalente.

### UX Design Requirements

No aplica — proyecto backend puro. No existe documento de UX Design.

### FR Coverage Map

FR-01: Epic 1 — Agregación MongoDB top 5 páginas por visitante
FR-02: Epic 1 — Campo `topPages` en `GetVisitorActivityResponseDto`
FR-03: Epic 3 — Endpoint `POST /visitors/:id/register-lead`
FR-04: Epic 3 — Lifecycle → `LEAD` + `VisitorLeadRegisteredEvent`
FR-05: Epic 3 — Sync asíncrono a Leadcars (BullMQ, 1 retry)
FR-06: Epic 3 — Campo `sync_status` en el agregado Lead
FR-07: Epic 3 — Response con `leadId` + `syncStatus` siempre presente
FR-08: Epic 2 — `leadcarsApiKey` encriptada por tenant en PostgreSQL
FR-09: Epic 2 — Endpoint `POST /company/leadcars/verify`
FR-10: Epic 2 — API key nunca expuesta en responses ni logs
FR-11: Epic 2 — `GetLeadcarsApiKeyQuery` cross-context vía QueryBus

## Epic List

### Epic 1: Intereses del Visitante en la Consola Comercial

El comercial puede ver las top 5 páginas más visitadas por el visitante directamente en el panel de actividad, sin pasos adicionales, lo que le permite personalizar su primer mensaje con contexto real en lugar de un contacto en frío.
**FRs cubiertos:** FR-01, FR-02

### Epic 2: Configuración de la Integración Leadcars por Empresa

El administrador puede configurar la API key de Leadcars para su empresa y verificar que la conexión es válida, habilitando la sincronización automática de leads para todos los comerciales del tenant.
**FRs cubiertos:** FR-08, FR-09, FR-10, FR-11

### Epic 3: Registro de Leads y Sincronización Automática con Leadcars

El comercial puede registrar los datos personales de un visitante (nombre, email, teléfono) en guiders y ese lead aparece automáticamente en Leadcars en menos de 5 segundos, sin ninguna acción adicional. Si Leadcars no está disponible, guiders no se bloquea y reintenta la sincronización automáticamente.
**FRs cubiertos:** FR-03, FR-04, FR-05, FR-06, FR-07

---

## Epic 1: Intereses del Visitante en la Consola Comercial

El comercial puede ver las top 5 páginas más visitadas por el visitante directamente en el panel de actividad, sin pasos adicionales, lo que le permite personalizar su primer mensaje con contexto real en lugar de un contacto en frío.

### Story 1.1: Método `getTopPagesByVisitor` en TrackingEventRepository

Como desarrollador que implementa la feature de intereses del visitante,
quiero un método `getTopPagesByVisitor(visitorId)` en la interfaz e implementación MongoDB de `TrackingEventRepository` que use el pipeline `[$match → $group → $sort → $limit → $project]`,
para que el query handler pueda obtener las top páginas de forma limpia y performante sin duplicar lógica de agregación.

**Acceptance Criteria:**

**Given** la interfaz `TrackingEventRepository` en `tracking-v2/domain/`
**When** se añade el método `getTopPagesByVisitor(visitorId: VisitorId): Promise<Result<TopPage[], DomainError>>`
**Then** la interfaz exporta el tipo `TopPage = { url: string; visits: number }`
**And** la implementación MongoDB usa exactamente el pipeline: `$match(visitorId, PAGE_VIEW) → $group(_id: url, visits: $sum 1) → $sort(visits: -1) → $limit(5) → $project(url, visits)`

**Given** un visitante con eventos `PAGE_VIEW` para múltiples URLs
**When** se llama `getTopPagesByVisitor`
**Then** solo se agregan eventos con `eventType === 'PAGE_VIEW'`
**And** cada URL aparece una sola vez con el total de visitas acumuladas
**And** el resultado tiene como máximo 5 elementos ordenados por visitas descendente

**Given** un visitante sin eventos `PAGE_VIEW`
**When** se llama `getTopPagesByVisitor`
**Then** el resultado es `ok([])` — array vacío, nunca `null` ni error de dominio

**Given** el schema de la colección de tracking events
**When** el método se despliega
**Then** existe el índice compuesto `{ visitorId: 1, eventType: 1 }` declarado en el schema Mongoose de tracking events

---

### Story 1.2: Exposición de `topPages` en `GET /visitors/:id/activity`

Como comercial,
quiero que la respuesta de `GET /visitors/:id/activity` incluya el campo `topPages` con las páginas más visitadas por el visitante,
para poder personalizar mi primer mensaje con contexto real en lugar de un contacto en frío.

**Acceptance Criteria:**

**Given** un visitante con eventos `PAGE_VIEW` en tracking
**When** llamo a `GET /visitors/:id/activity`
**Then** la respuesta incluye `"topPages": [{ "url": string, "visits": number }]`
**And** el array tiene como máximo 5 elementos, ordenados por visitas descendente

**Given** un visitante sin eventos `PAGE_VIEW`
**When** llamo a `GET /visitors/:id/activity`
**Then** la respuesta incluye `"topPages": []` — nunca `null` ni campo ausente

**Given** el contrato existente de `GET /visitors/:id/activity`
**When** se despliega el cambio
**Then** todos los campos existentes de la respuesta permanecen sin cambios (backward compatible)
**And** `topPages` es un campo aditivo nuevo que no rompe clientes existentes

**Given** una llamada válida al endpoint bajo carga normal
**When** se mide la latencia
**Then** el tiempo total de respuesta no supera 200ms p95
**And** la agregación de `topPages` añade como máximo +100ms respecto al tiempo base

---

## Epic 2: Configuración de la Integración Leadcars por Empresa

El administrador puede configurar la API key de Leadcars para su empresa y verificar que la conexión es válida, habilitando la sincronización automática de leads para todos los comerciales del tenant.

### Story 2.1: `EncryptionService` en `shared/infrastructure/encryption/`

Como desarrollador,
quiero un `EncryptionService` en `shared/infrastructure/encryption/` usando `crypto` de Node.js con AES-256,
para que campos sensibles como `leadcarsApiKey` puedan cifrarse en reposo sin exponer lógica de encriptación a las capas de dominio.

**Acceptance Criteria:**

**Given** `EncryptionService` registrado como `@Injectable()` en `SharedModule`
**When** se llama `encrypt(plaintext: string): string`
**Then** devuelve un string cifrado distinto del valor original
**And** el resultado varía en cada llamada (IV aleatorio por cifrado)

**Given** un valor cifrado con `encrypt`
**When** se llama `decrypt(ciphertext: string): string`
**Then** devuelve exactamente el plaintext original

**Given** la variable de entorno `ENCRYPTION_KEY` no está definida
**When** el módulo se inicializa
**Then** la aplicación lanza un error descriptivo en el arranque (fail-fast)

**Given** `ENCRYPTION_KEY` definida como 32 bytes en hex
**When** el servicio se usa
**Then** la clave se lee del entorno y nunca se loguea ni serializa

---

### Story 2.2: Almacenamiento encriptado de `leadcarsApiKey` en `company`

Como administrador,
quiero poder almacenar la API key de Leadcars de mi empresa en guiders de forma segura,
para que la integración pueda autenticarse con Leadcars en mi nombre sin exponer la clave en texto plano.

**Acceptance Criteria:**

**Given** la entidad `company` en PostgreSQL
**When** se aplica la migración TypeORM
**Then** existe la columna `leadcars_api_key VARCHAR` en la tabla `company` (nullable)

**Given** un `Company` con `leadcarsApiKey` definida
**When** el mapper `CompanyMapper.toPersistence()` serializa la entidad
**Then** el valor almacenado en BD está cifrado con AES-256 vía `EncryptionService`
**And** el valor original nunca aparece en texto plano en la BD

**Given** una fila de `company` con `leadcars_api_key` cifrado
**When** el mapper `CompanyMapper.fromPersistence()` deserializa la fila
**Then** el dominio recibe el value object `LeadcarsApiKey` con el valor en texto plano descifrado

**Given** cualquier response del API de `company`
**When** se serializa la entidad company
**Then** el campo `leadcarsApiKey` nunca aparece en el payload de respuesta

---

### Story 2.3: `GetLeadcarsApiKeyQuery` — acceso cross-context a la API key

Como desarrollador,
quiero una query `GetLeadcarsApiKeyQuery` con su handler en `company/application/queries/`,
para que el contexto `leadcars` pueda leer la API key de una empresa vía `QueryBus` sin acoplarse directamente al repositorio de `company`.

**Acceptance Criteria:**

**Given** un `companyId` válido con `leadcarsApiKey` configurada
**When** se ejecuta `QueryBus.execute(new GetLeadcarsApiKeyQuery(companyId))`
**Then** el handler devuelve `Result<string, DomainError>` con el valor descifrado de la API key

**Given** un `companyId` válido sin `leadcarsApiKey` configurada
**When** se ejecuta `GetLeadcarsApiKeyQuery`
**Then** devuelve un `Result` con error de dominio descriptivo (ej. `LeadcarsApiKeyNotConfigured`)

**Given** el handler de la query
**When** resuelve la API key
**Then** el valor nunca se loguea ni aparece en trazas de error
**And** el contexto `company` no exporta ningún repositorio directamente al exterior

---

### Story 2.4: Endpoint de verificación de conexión Leadcars

Como administrador,
quiero llamar a `POST /company/leadcars/verify` para comprobar que mi API key de Leadcars es válida,
para confirmar que la integración está correctamente configurada antes de depender de ella para sincronizar leads.

**Acceptance Criteria:**

**Given** una empresa con `leadcarsApiKey` configurada y la API de Leadcars disponible
**When** llamo a `POST /company/leadcars/verify`
**Then** la respuesta es `{ "success": true, "message": "Conexión con Leadcars verificada correctamente." }`
**And** el status HTTP es `200`

**Given** una empresa con `leadcarsApiKey` configurada pero la API de Leadcars devuelve error de autenticación
**When** llamo a `POST /company/leadcars/verify`
**Then** la respuesta es `{ "success": false, "message": "API key de Leadcars inválida." }`
**And** el status HTTP es `200` (no 5xx — es un resultado esperado)

**Given** una empresa sin `leadcarsApiKey` configurada
**When** llamo a `POST /company/leadcars/verify`
**Then** la respuesta indica que no hay API key configurada
**And** el status HTTP es `422`

**Given** el endpoint
**When** se llama con un usuario sin rol `admin`
**Then** la respuesta es `403 Forbidden`

---

## Epic 3: Registro de Leads y Sincronización Automática con Leadcars

El comercial puede registrar los datos personales de un visitante (nombre, email, teléfono) en guiders y ese lead aparece automáticamente en Leadcars en menos de 5 segundos, sin ninguna acción adicional. Si Leadcars no está disponible, guiders no se bloquea y reintenta la sincronización automáticamente.

### Story 3.1: Agregado `Lead` en `visitors-v2`

Como desarrollador,
quiero un agregado `Lead` con sus value objects (`LeadId`, `LeadSyncStatus`), schema Mongoose, repositorio e interfaz en `visitors-v2`,
para que los datos del lead puedan persistirse en MongoDB de forma independiente al visitante, con su propio ciclo de vida de sincronización.

**Acceptance Criteria:**

**Given** el agregado `Lead` en `visitors-v2/domain/entities/`
**When** se llama `Lead.create(visitorId, companyId, name, email, phone)`
**Then** se crea un `Lead` con `syncStatus = pending` y emite `VisitorLeadRegisteredEvent`
**And** `Lead.fromPrimitives()` rehidrata sin emitir eventos

**Given** el value object `LeadSyncStatus`
**When** se instancia con un valor válido (`pending`, `synced`, `failed`)
**Then** solo acepta esos tres valores — cualquier otro lanza error en construcción

**Given** el schema `LeadMongoEntity`
**When** se declara en Mongoose
**Then** incluye el índice `{ visitorId: 1, syncStatus: 1 }` declarado explícitamente
**And** el nombre de colección es `'leads'`

**Given** la interfaz `LeadRepository` con símbolo `LEAD_REPOSITORY`
**When** se implementa `MongoLeadRepositoryImpl`
**Then** expone los métodos: `save(lead)`, `findById(id)`, `findPendingSync(companyId)`
**And** usa `LeadMapper` para traducir entre dominio y persistencia sin exponer el schema Mongoose

---

### Story 3.2: Command `RegisterVisitorLeadCommand` y endpoint `POST /visitors/:id/register-lead`

Como comercial,
quiero llamar a `POST /visitors/:id/register-lead` con el nombre, email y teléfono del visitante,
para registrar al visitante como lead en guiders e iniciar automáticamente el proceso de sincronización con Leadcars.

**Acceptance Criteria:**

**Given** un visitante existente y datos válidos `{ name, email, phone }`
**When** llamo a `POST /visitors/:visitorId/register-lead`
**Then** se crea un `Lead` con `syncStatus: "pending"` en la colección `leads`
**And** la respuesta es `{ "success": true, "data": { "leadId": "<uuid>", "syncStatus": "pending" }, "message": "Lead registrado. Sincronización con Leadcars pendiente." }`
**And** el status HTTP es `201`

**Given** el command handler `RegisterVisitorLeadCommandHandler`
**When** persiste el lead
**Then** llama a `publisher.mergeObjectContext(lead)`, guarda con `repository.save()` y llama a `commit()` para despachar `VisitorLeadRegisteredEvent`

**Given** datos de entrada con email inválido o campos requeridos ausentes
**When** llamo a `POST /visitors/:visitorId/register-lead`
**Then** la respuesta es `400 Bad Request` con descripción del error de validación

**Given** un `visitorId` que no existe
**When** llamo a `POST /visitors/:visitorId/register-lead`
**Then** la respuesta es `404 Not Found`

**Given** el endpoint
**When** se llama sin autenticación válida o sin rol `commercial`
**Then** la respuesta es `401` o `403`

---

### Story 3.3: Contexto `leadcars` — puerto, cliente HTTP y módulo

Como desarrollador,
quiero un contexto DDD `src/context/leadcars/` con su interfaz de puerto, implementación HTTP con `@nestjs/axios` y módulo NestJS con BullMQ registrado,
para que el processor de sincronización tenga toda la infraestructura necesaria para comunicarse con la API de Leadcars de forma desacoplada.

**Acceptance Criteria:**

**Given** la interfaz `LeadcarsClientPort` en `leadcars/domain/ports/`
**When** se define
**Then** expone el método `createLead(dto: CreateLeadcarsLeadDto): Promise<Result<void, DomainError>>`
**And** no importa nada de infraestructura — solo tipos de dominio compartido

**Given** `LeadcarsHttpService` en `leadcars/infrastructure/http/`
**When** implementa `LeadcarsClientPort`
**Then** usa `@nestjs/axios` para hacer la llamada HTTP a Leadcars
**And** aplica timeout máximo de 3s en la llamada
**And** devuelve `Result` — nunca lanza excepciones para flujos esperados

**Given** `LeadcarsModule`
**When** se importa en `AppModule`
**Then** registra `BullModule.registerQueue({ name: 'leadcars-sync' })`
**And** provee `LeadcarsHttpService` bajo el token `LEADCARS_CLIENT_PORT`
**And** `AppModule` registra `BullModule.forRoot(...)` con la conexión Redis

---

### Story 3.4: Sincronización asíncrona de leads a Leadcars vía BullMQ

Como comercial,
quiero que los leads registrados en guiders se sincronicen automáticamente con Leadcars en menos de 5 segundos, con reintento automático si Leadcars no está disponible,
para no tener que introducir los datos manualmente en el CRM y no perder ningún lead aunque haya una caída temporal.

**Acceptance Criteria:**

**Given** que se emite `VisitorLeadRegisteredEvent` tras registrar un lead
**When** el handler `SyncLeadToLeadcarsOnVisitorLeadRegisteredEventHandler` lo recibe
**Then** encola un job `LeadcarsSyncJobDto` en la cola `'leadcars-sync'` con `{ leadId, companyId }`
**And** no realiza ninguna llamada HTTP directamente — solo encola

**Given** un job en la cola `'leadcars-sync'`
**When** `LeadcarsSyncProcessor` lo procesa
**Then** obtiene la API key ejecutando `QueryBus.execute(new GetLeadcarsApiKeyQuery(companyId))`
**And** llama a `LeadcarsClientPort.createLead(dto)` con los datos del lead
**And** si la llamada es exitosa, actualiza `syncStatus → synced` vía `LeadRepository`
**And** si la llamada falla, actualiza `syncStatus → failed` vía `LeadRepository` sin lanzar excepción

**Given** el job configurado con `attempts: 2, backoff: { type: 'fixed', delay: 3000 }`
**When** el primer intento falla por error transitorio de Leadcars
**Then** BullMQ reintenta automáticamente una vez tras 3s
**And** si el reintento también falla, el `syncStatus` final es `failed`

**Given** un fallo completo de Leadcars (ambos intentos fallidos)
**When** el comercial registra el lead
**Then** el lead queda guardado en guiders con `syncStatus: "failed"`
**And** el flujo de registro del comercial no se bloquea — recibió `201` con `syncStatus: "pending"` en el momento del registro

**Given** que Redis se reinicia durante el proceso de sync
**When** BullMQ recupera los jobs pendientes
**Then** los jobs no procesados se reencolan automáticamente (persistencia garantizada por BullMQ + Redis)
