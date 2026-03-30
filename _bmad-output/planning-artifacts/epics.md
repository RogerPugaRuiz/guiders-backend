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
lastUpdated: 30/03/2026
updateReason: Reconciliación épicas con código implementado — la implementación divergió del plan original en arquitectura (MongoDB vs PostgreSQL, adapter pattern vs contexto separado, sync síncrono vs BullMQ)
---

# guiders-backend - Epic Breakdown

## Overview

Este documento proporciona el desglose completo de epics y stories para **guiders-backend**, descomponiendo los requisitos del PRD y la Arquitectura en stories implementables. Alcance: Epic 1 (intereses del visitante) + Epic 2 (configuración CRM/Leadcars) + Epic 3 (registro de leads y sincronización CRM) + Epic 4 (alineación con API LeadCars v2.4).

> **Nota sobre divergencia arquitectónica:** La implementación real difiere del plan original en varios aspectos clave:
>
> - La configuración CRM se almacena en **MongoDB** (colección `crm_company_configs` en contexto `leads`) en lugar de PostgreSQL (tabla `company`).
> - No existe un contexto separado `src/context/leadcars/`. Toda la integración vive como **adapter** dentro de `leads/infrastructure/adapters/leadcars/`.
> - La sincronización es **síncrona** con retry HTTP (no BullMQ).
> - Se implementó un patrón **multi-CRM** (`CrmSyncServiceFactory`) que soporta extensión a HubSpot/Salesforce.
> - Se añadió funcionalidad no planificada: sync de chat a CRM, CRUD completo de config, proxy discovery LeadCars.

## Requirements Inventory

### Functional Requirements

FR-01: El sistema debe agregar eventos `PAGE_VIEW` por visitante en MongoDB y retornar las top 5 URLs más visitadas con su conteo de visitas, como parte de la respuesta de `GET /visitors/:id/activity`.

FR-02: El sistema debe añadir el campo `topPages: { url: string; visits: number }[]` a `GetVisitorActivityResponseDto`. Si no hay datos, devuelve array vacío `[]` (nunca `null`). Máximo 5 elementos.

FR-03: El sistema debe exponer un endpoint `POST /leads/contact-data/:visitorId` que acepte datos de contacto del visitante (nombre, apellidos, email, teléfono, DNI, población) y los persista en MongoDB.

FR-04: Al transicionar el lifecycle del visitante al estado `LEAD`, el sistema debe sincronizar automáticamente los datos de contacto al CRM configurado (si existe configuración con trigger `lifecycle_to_lead`).

FR-05: El sistema debe sincronizar el lead a Leadcars con retry HTTP (3 intentos, backoff exponencial con jitter), sin bloquear el flujo principal del registro.

FR-06: El sistema debe mantener registros de sincronización (`CrmSyncRecord`) con estados `pending | synced | failed | partial` y reflejarlos en endpoints de dashboard.

FR-07: La respuesta del endpoint de contact data debe incluir los datos guardados con confirmación de creación/actualización.

FR-08: El sistema debe almacenar la configuración CRM por empresa (tenant) en MongoDB (colección `crm_company_configs`), incluyendo `clienteToken`, `concesionarioId`, `sedeId`, `campanaId`, `tipoLeadDefault` y flags de comportamiento.

FR-09: El sistema debe exponer endpoints para testear la conexión CRM: `POST /v1/leads/admin/test-connection` (credenciales manuales) y `POST /v1/leads/admin/config/:configId/test` (config guardada).

FR-10: El `clienteToken` de LeadCars debe tratarse como dato sensible: sanitizar en logs (implementado en `LeadcarsApiService`).

FR-11: ~~`GetLeadcarsApiKeyQuery` cross-context~~ → Reemplazado por acceso directo al `CrmCompanyConfigRepository` dentro del contexto `leads`.

FR-12: (NUEVO) El sistema debe sincronizar conversaciones de chat cerradas al CRM cuando la empresa tiene habilitado `syncChatConversations`.

FR-13: (NUEVO) El sistema debe exponer endpoints proxy para discovery de datos LeadCars: concesionarios, sedes, campañas y tipos de lead.

FR-14: (NUEVO) El sistema debe soportar CRUD completo de configuración CRM por empresa con validación de ownership.

FR-15: (NUEVO — API v2.4) Los campos enviados a LeadCars en POST /leads deben usar los nombres exactos de la API v2.4: `concesionario` (no `concesionario_id`), `sede` (no `sede_id`), `tipo_lead` como número (no string), `campana` como texto (no número), y campos dinámicos al nivel raíz (no `datos_adicionales`).

FR-16: (NUEVO — API v2.4) El tipo de lead (`tipo_lead`) debe ser un ID numérico obtenido de `GET /tipos`, no un string enum.

FR-17: (NUEVO — API v2.4) La estructura de `chat_conversation` enviada a LeadCars debe usar el formato oficial: `{ chat: { chat_id, users[], messages[] } }` con `interaction_type: welcome | default | close`.

FR-18: (NUEVO — API v2.4) El sistema debe soportar el módulo Automagic (journeys/nurturing) de LeadCars v2.4, incluyendo listar flujos, asignar leads a flujos, y consultar estado. Módulo opcional con autenticación separada (`api-user` + `api-token`).

FR-19: (NUEVO — API v2.4) Los teléfonos enviados a LeadCars deben estar en formato E.164 (+CODIGOPAIS + NUMERO, ej: +34612345678).

### NonFunctional Requirements

NFR-01: Latencia de `GET /visitors/:id/activity` ≤ 200ms p95. El overhead de la agregación top páginas no debe superar +100ms.

NFR-02: La sincronización a Leadcars debe usar retry HTTP con backoff exponencial. Timeout máximo 3s por intento. 3 intentos con jitter.

NFR-03: Fiabilidad de entrega de leads a Leadcars ≥ 99%. Los leads fallidos quedan registrados en `CrmSyncRecord` con estado `failed` para retry manual o monitoreo.

NFR-04: Un fallo de Leadcars no debe afectar el flujo de registro de contacto en guiders — el contacto se guarda siempre, el sync es eventual.

NFR-05: El `clienteToken` de LeadCars debe sanitizarse en logs de error y nunca exponerse en trazas.

NFR-06: ~~Persistencia de cola BullMQ~~ → No aplica. El retry es a nivel HTTP. Los sync records persisten el estado para monitoreo.

### Additional Requirements

> Extraídos de la implementación real y el documento de arquitectura.

- **AR-01 (Adapter Pattern):** La integración con LeadCars usa el patrón Adapter. `LeadcarsCrmSyncAdapter` implementa `ICrmSyncService` y es registrado en `CrmSyncServiceFactory`. Extensible para HubSpot/Salesforce añadiendo nuevos adapters.

- **AR-02 (Retry HTTP):** `LeadcarsApiService` implementa retry con backoff exponencial y jitter: `retries: 3`, `baseDelay: 1000ms`, `maxDelay: 10000ms`. No se reintenta en errores 4xx (excepto 429).

- **AR-03 (MongoDB persistence):** Los datos de contacto, configuración CRM y registros de sync se almacenan en MongoDB en el contexto `leads`. Colecciones: `lead_contact_data`, `crm_company_configs`, `crm_sync_records`.

- **AR-04 (Event-driven sync):** Dos event handlers disparan la sincronización: `SyncLeadOnLifecycleChangedEventHandler` (en lifecycle → LEAD) y `SyncChatOnChatClosedEventHandler` (en chat cerrado).

- **AR-05 (Multi-CRM factory):** `CrmSyncServiceFactory` permite registrar múltiples adapters por `CrmType`. Actualmente solo `'leadcars'` está implementado. El tipo soporta `'leadcars' | 'hubspot' | 'salesforce'`.

- **AR-06 (Idempotencia):** Los sync records garantizan idempotencia: no se re-sincroniza un lead ya sincronizado (`LeadAlreadySyncedError`) ni un chat ya sincronizado (`ChatAlreadySyncedError`).

- **AR-07 (Índice MongoDB):** `CrmCompanyConfigSchema` tiene índice unique `(companyId, crmType)`. `CrmSyncRecordSchema` tiene índice unique `(visitorId, companyId, crmType)`. `LeadContactDataSchema` tiene índice unique `(visitorId, companyId)`.

- **AR-08 (Brownfield — sin breaking changes):** Todas las features se integran con contratos de API existentes sin romper cambios.

- **AR-09 (Orden de implementación restante):** Para Epic 1: pipeline de agregación → query handler → DTO update. Para funcionalidades pendientes de Epic 2/3: encriptación API key → endpoint register-lead unificado.

- **AR-10 (Variable de entorno):** `ENCRYPTION_KEY=<32 bytes hex>` — pendiente de implementar para encriptación en reposo de API keys CRM.

- **AR-11 (API LeadCars v2.4):** Los tipos en `leadcars.types.ts` deben alinearse con la especificación oficial de la API v2.4 (`docs/leadcar/LeadCars_API_V2_4.pdf`). Los campos del POST /leads son: `nombre`, `apellidos`, `email`, `telefono` (E.164), `movil` (E.164), `cp`, `provincia`, `comentario`, `url_origen`, `concesionario` (número), `sede` (número), `tipo_lead` (número = ID), `campana` (texto = código) + campos dinámicos al nivel raíz.

- **AR-12 (Chat Conversation v2.4):** La estructura de `POST /leads/{id}/chat_conversation` es `{ chat: { chat_id, users[], messages[] } }` con `interaction_type: welcome | default | close`. Los `users` se dividen en `user` (comercial) y `visitor` (visitante).

- **AR-13 (Automagic):** Módulo opcional de nurturing en LeadCars v2.4. Usa autenticación separada (`api-user` + `api-token`). Endpoints: `GET /journeys/list/summary`, `POST /journeys/generate-lead-journey`, `GET /journeys/list/get-lead-journeys`.

### UX Design Requirements

No aplica — proyecto backend puro. No existe documento de UX Design.

### FR Coverage Map

FR-01: Epic 1 — Agregación MongoDB top 5 páginas por visitante
FR-02: Epic 1 — Campo `topPages` en `GetVisitorActivityResponseDto`
FR-03: Epic 3 — Endpoint `POST /leads/contact-data/:visitorId` ✅
FR-04: Epic 3 — Sync automático en lifecycle → LEAD ✅
FR-05: Epic 3 — Retry HTTP con backoff exponencial ✅
FR-06: Epic 3 — `CrmSyncRecord` con estados ✅
FR-07: Epic 3 — Response de contact data ✅
FR-08: Epic 2 — Config CRM por tenant en MongoDB ✅
FR-09: Epic 2 — Endpoints test-connection ✅
FR-10: Epic 2 — Sanitización de token en logs ✅
FR-11: ~~Cross-context query~~ — No necesario (todo en `leads`) ✅
FR-12: Epic 3 — Sync chat a CRM en cierre ✅
FR-13: Epic 2 — Proxy discovery LeadCars ✅
FR-14: Epic 2 — CRUD config CRM ✅

FR-15: Epic 4 — Corrección nombres de campos POST /leads
FR-16: Epic 4 — tipo_lead como ID numérico
FR-17: Epic 4 — Estructura chat_conversation formato oficial
FR-18: Epic 4 — Módulo Automagic (journeys/nurturing)
FR-19: Epic 4 — Formato E.164 para teléfonos

## Epic List

### Epic 1: Intereses del Visitante en la Consola Comercial

El comercial puede ver las top 5 páginas más visitadas por el visitante directamente en el panel de actividad, sin pasos adicionales, lo que le permite personalizar su primer mensaje con contexto real en lugar de un contacto en frío.
**FRs cubiertos:** FR-01, FR-02
**Estado:** backlog

### Epic 2: Configuración CRM y Panel de Administración LeadCars

El administrador puede configurar la integración con LeadCars para su empresa (API key, concesionario, sede, campaña, tipo de lead), verificar que la conexión es válida, y gestionar la configuración completa desde el panel de administración.
**FRs cubiertos:** FR-08, FR-09, FR-10, FR-13, FR-14
**Estado:** done (funcionalidad core completada — pendiente encriptación en reposo)

### Epic 3: Gestión de Datos de Contacto y Sincronización CRM

El comercial puede guardar datos de contacto de un visitante en guiders. Cuando el visitante transiciona a estado LEAD, sus datos se sincronizan automáticamente al CRM configurado. Las conversaciones de chat cerradas también se sincronizan al CRM. Si el CRM no está disponible, guiders no se bloquea y registra el estado de sincronización para monitoreo.
**FRs cubiertos:** FR-03, FR-04, FR-05, FR-06, FR-07, FR-12
**Estado:** done (funcionalidad core completada)

### Epic 4: Alineación con API LeadCars v2.4

Los tipos, el mapeo de campos y la estructura de datos del adaptador LeadCars deben alinearse con la especificación real de la API v2.4 (documentada en `docs/leadcar/LeadCars_API_V2_4.pdf`, revisión 10/06/2025). Incluye corrección de nombres de campos, tipo de lead numérico, estructura oficial de chat, formato E.164 para teléfonos, e integración del nuevo módulo Automagic (nurturing).
**FRs cubiertos:** FR-05 (corrección), FR-12 (corrección), FR-15, FR-16, FR-17, FR-18, FR-19
**Estado:** backlog

---

## Epic 1: Intereses del Visitante en la Consola Comercial

El comercial puede ver las top 5 páginas más visitadas por el visitante directamente en el panel de actividad, sin pasos adicionales, lo que le permite personalizar su primer mensaje con contexto real en lugar de un contacto en frío.

### Story 1.1: Método `getTopPagesByVisitor` en TrackingEventRepository

**Estado:** backlog

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

**Estado:** backlog

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

## Epic 2: Configuración CRM y Panel de Administración LeadCars

El administrador puede configurar la integración con LeadCars para su empresa (API key, concesionario, sede, campaña, tipo de lead), verificar que la conexión es válida, y gestionar la configuración completa desde el panel de administración.

### Story 2.1: CRUD de Configuración CRM por Empresa ✅

**Estado:** done

Como administrador,
quiero poder crear, leer, actualizar y eliminar la configuración CRM de mi empresa desde el panel de administración,
para gestionar la integración con LeadCars de forma completa.

**Implementación:**

- Controller: `leads-admin.controller.ts` — rutas `POST/GET/PUT/DELETE /v1/leads/admin/config`
- Schema: `CrmCompanyConfigSchema` en MongoDB (colección `crm_company_configs`)
- Repository: `MongoCrmCompanyConfigRepositoryImpl`
- DTOs: `CreateCrmConfigDto`, `UpdateCrmConfigDto`, `CrmConfigResponseDto`
- Índice unique: `(companyId, crmType)`
- Validación de ownership por `companyId` del JWT
- Roles: solo `admin`

**Acceptance Criteria (verificados):**

**Given** un administrador autenticado
**When** llama a `POST /v1/leads/admin/config` con datos válidos de LeadCars
**Then** se crea la configuración CRM para su empresa en MongoDB
**And** la respuesta incluye el ID de la configuración creada

**Given** una empresa con configuración CRM existente
**When** el admin llama a `GET /v1/leads/admin/config`
**Then** recibe la configuración activa de su empresa

**Given** una configuración CRM existente propiedad del admin
**When** llama a `PUT /v1/leads/admin/config/:id`
**Then** se actualizan solo los campos enviados
**And** se valida ownership por `companyId`

**Given** un usuario sin rol `admin`
**When** intenta acceder a cualquier endpoint de config
**Then** recibe `403 Forbidden`

---

### Story 2.2: Cliente HTTP LeadCars con Retry ✅

**Estado:** done

Como desarrollador,
quiero un cliente HTTP para la API de LeadCars v2 con retry automático y backoff exponencial,
para que las llamadas a LeadCars sean resilientes ante fallos transitorios.

**Implementación:**

- Servicio: `LeadcarsApiService` en `leads/infrastructure/adapters/leadcars/`
- Tipos: `leadcars.types.ts` — definiciones completas de la API LeadCars v2
- Adapter: `LeadcarsCrmSyncAdapter` implementando `ICrmSyncService`
- Factory: `CrmSyncServiceFactory` registra el adapter de LeadCars
- Retry: 3 intentos, backoff exponencial con jitter, no retry en 4xx (excepto 429)
- Sanitización de `clienteToken` en logs

**Acceptance Criteria (verificados):**

**Given** una llamada HTTP a LeadCars que falla por error transitorio
**When** el servicio ejecuta la llamada
**Then** reintenta hasta 3 veces con backoff exponencial y jitter
**And** no reintenta errores 4xx (excepto 429)

**Given** datos de un lead para sincronizar
**When** se llama a `LeadcarsCrmSyncAdapter.syncLead()`
**Then** se mapean los datos de contacto al formato `LeadcarsCreateLeadRequest`
**And** se incluye `origen_lead: 'CHAT'` y datos adicionales de Guiders

**Given** un error con el `clienteToken` en la respuesta
**When** se loguea el error
**Then** el token está sanitizado y no aparece en texto plano en los logs

---

### Story 2.3: Proxy Discovery de Datos LeadCars ✅

**Estado:** done

Como administrador,
quiero poder consultar los concesionarios, sedes, campañas y tipos de lead disponibles en LeadCars desde guiders,
para configurar correctamente la integración sin tener que acceder a la plataforma LeadCars.

**Implementación:**

- Controller: `leads-admin.controller.ts` — 4 endpoints proxy
- `GET /v1/leads/admin/leadcars/concesionarios`
- `GET /v1/leads/admin/leadcars/sedes/:concesionarioId`
- `GET /v1/leads/admin/leadcars/campanas/:concesionarioId`
- `GET /v1/leads/admin/leadcars/tipos`
- DTOs: `LeadcarsConcesionarioDto`, `LeadcarsSedeDto`, `LeadcarsCampanaDto`, `LeadcarsTipoLeadDto`
- Roles: solo `admin`

**Acceptance Criteria (verificados):**

**Given** una empresa con configuración LeadCars activa
**When** el admin llama a `GET /v1/leads/admin/leadcars/concesionarios`
**Then** recibe la lista de concesionarios disponibles en la cuenta LeadCars

**Given** un `concesionarioId` válido
**When** el admin llama a `GET /v1/leads/admin/leadcars/sedes/:concesionarioId`
**Then** recibe las sedes del concesionario
**And** lo mismo aplica para campañas

---

### Story 2.4: Endpoints de Test de Conexión CRM ✅

**Estado:** done

Como administrador,
quiero poder verificar que mi configuración de LeadCars es válida antes de activar la sincronización automática,
para confirmar que la integración funciona correctamente.

**Implementación:**

- `POST /v1/leads/admin/test-connection` — test con credenciales manuales
- `POST /v1/leads/admin/config/:configId/test` — test con config guardada
- Validación: llama a `listConcesionarios` como health check de conexión
- DTOs: `TestCrmConnectionDto`, `TestConnectionResponseDto`, `TestConnectionByIdResponseDto`

**Acceptance Criteria (verificados):**

**Given** credenciales LeadCars válidas
**When** el admin llama a `POST /v1/leads/admin/test-connection`
**Then** la respuesta indica conexión exitosa

**Given** credenciales LeadCars inválidas
**When** el admin llama a `POST /v1/leads/admin/test-connection`
**Then** la respuesta indica fallo de conexión con mensaje descriptivo
**And** el status HTTP es 200 (es un resultado esperado, no error de servidor)

**Given** una config guardada con ID válido
**When** el admin llama a `POST /v1/leads/admin/config/:configId/test`
**Then** usa las credenciales de la config guardada para testear

---

### Story 2.5: Encriptación en Reposo de API Keys CRM

**Estado:** backlog

Como administrador,
quiero que la API key de LeadCars se almacene encriptada en la base de datos,
para que un acceso no autorizado a MongoDB no exponga las credenciales de mi cuenta LeadCars.

**Notas:** Existe `EncryptAdapter` en el contexto `auth` usando AES-256-CBC. Se requiere extraer/generalizar a `shared` o reutilizar para cifrar el campo `clienteToken` en `CrmCompanyConfigSchema`.

**Acceptance Criteria:**

**Given** un `EncryptionService` disponible en `shared` (o reutilización del existente en `auth`)
**When** se guarda una configuración CRM con `clienteToken`
**Then** el valor se almacena cifrado con AES-256 en MongoDB
**And** se descifra al leer la configuración para uso interno

**Given** la variable de entorno `ENCRYPTION_KEY` no está definida
**When** el módulo se inicializa
**Then** la aplicación lanza un error descriptivo en el arranque (fail-fast)

**Given** cualquier response del API de configuración CRM
**When** se serializa la respuesta
**Then** el `clienteToken` nunca aparece en texto plano en la respuesta
**And** se muestra un valor enmascarado (ej. `"****abcd"`)

**Given** un error en cualquier operación CRM
**When** se loguea el error
**Then** el `clienteToken` está sanitizado en todos los logs

---

## Epic 3: Gestión de Datos de Contacto y Sincronización CRM

El comercial puede guardar datos de contacto de un visitante en guiders. Cuando el visitante transiciona a estado LEAD, sus datos se sincronizan automáticamente al CRM configurado. Las conversaciones de chat cerradas también se sincronizan al CRM. Si el CRM no está disponible, guiders no se bloquea y registra el estado de sincronización para monitoreo.

### Story 3.1: Gestión de Datos de Contacto del Visitante ✅

**Estado:** done

Como comercial,
quiero poder guardar y actualizar los datos de contacto de un visitante (nombre, apellidos, email, teléfono, DNI, población),
para tener la información necesaria cuando se registre como lead.

**Implementación:**

- Controller: `leads-contact.controller.ts`
- `POST /leads/contact-data/:visitorId` — upsert con merge parcial
- `GET /leads/contact-data/:visitorId` — obtener datos por visitor
- `GET /leads/contact-data` — listar todos los contactos de la empresa
- Command: `SaveLeadContactDataCommand` + handler con upsert/merge inteligente
- Schema: `LeadContactDataSchema` en MongoDB (colección `lead_contact_data`)
- Repository: `MongoLeadContactDataRepositoryImpl`
- Evento: `LeadContactDataSavedEvent` al crear nuevo contacto
- Tests: 6 casos unitarios en `save-lead-contact-data-command.handler.spec.ts`
- Roles: `admin`, `commercial`

**Acceptance Criteria (verificados):**

**Given** datos de contacto para un visitante nuevo
**When** llamo a `POST /leads/contact-data/:visitorId` con `{ nombre, apellidos, email, telefono }`
**Then** se crea el registro en MongoDB
**And** se emite `LeadContactDataSavedEvent`

**Given** datos de contacto existentes para un visitante
**When** llamo a `POST /leads/contact-data/:visitorId` con campos parciales
**Then** se hace merge: los campos nuevos se actualizan, los existentes se preservan
**And** nunca se sobreescriben campos con `undefined`

**Given** un visitante con datos de contacto guardados
**When** llamo a `GET /leads/contact-data/:visitorId`
**Then** recibo los datos completos del contacto

---

### Story 3.2: Registros de Sincronización CRM y Dashboard ✅

**Estado:** done

Como administrador,
quiero ver el estado de sincronización de los leads con el CRM desde el panel de administración,
para monitorear qué leads se han sincronizado correctamente y cuáles han fallado.

**Implementación:**

- Schema: `CrmSyncRecordSchema` en MongoDB (colección `crm_sync_records`)
- Repository: `MongoCrmSyncRecordRepositoryImpl`
- Controller endpoints en `leads-admin.controller.ts`:
  - `GET /v1/leads/admin/sync-records` — todos los registros (enriquecidos con contact data)
  - `GET /v1/leads/admin/sync-records/failed` — solo fallidos
  - `GET /v1/leads/admin/sync-records/visitor/:visitorId` — por visitante
- Estados: `pending | synced | failed | partial`
- Idempotencia: `LeadAlreadySyncedError`, `ChatAlreadySyncedError`
- Índice unique: `(visitorId, companyId, crmType)`

**Acceptance Criteria (verificados):**

**Given** múltiples leads sincronizados con el CRM
**When** el admin llama a `GET /v1/leads/admin/sync-records`
**Then** recibe la lista de registros de sync enriquecidos con datos de contacto del visitante

**Given** leads con sync fallido
**When** el admin llama a `GET /v1/leads/admin/sync-records/failed`
**Then** recibe solo los registros con estado `failed`
**And** incluye el mensaje de error para diagnóstico

**Given** un lead que ya fue sincronizado exitosamente
**When** se intenta sincronizar nuevamente
**Then** se previene la duplicación vía `LeadAlreadySyncedError`

---

### Story 3.3: Sincronización Automática de Lead a CRM ✅

**Estado:** done

Como comercial,
quiero que cuando un visitante transiciona a estado LEAD, sus datos de contacto se sincronicen automáticamente al CRM configurado,
para no tener que introducir los datos manualmente en LeadCars.

**Implementación:**

- Event Handler: `SyncLeadOnLifecycleChangedEventHandler`
  - Escucha: `VisitorLifecycleChangedEvent` (de `visitors-v2`)
  - Condición: lifecycle cambió a `LEAD` + config CRM tiene trigger `lifecycle_to_lead`
  - Verifica que existen datos de contacto (email o teléfono requerido)
  - Despacha: `SyncLeadToCrmCommand`
- Command Handler: `SyncLeadToCrmCommandHandler`
  - Usa `CrmSyncServiceFactory` para obtener el adapter correcto
  - Crea/actualiza `CrmSyncRecord` con el estado del sync
  - Emite `LeadSyncedToCrmEvent` o `LeadSyncFailedEvent`
- Adapter: `LeadcarsCrmSyncAdapter.syncLead()` mapea a formato LeadCars y llama a la API

**Acceptance Criteria (verificados):**

**Given** un visitante con datos de contacto y una empresa con config LeadCars activa (trigger `lifecycle_to_lead`)
**When** el lifecycle del visitante cambia a `LEAD`
**Then** se sincroniza automáticamente el lead a LeadCars
**And** se crea un `CrmSyncRecord` con estado `synced`

**Given** un fallo en la llamada a LeadCars
**When** se intenta sincronizar el lead
**Then** el retry HTTP reintenta hasta 3 veces con backoff exponencial
**And** si falla definitivamente, el `CrmSyncRecord` queda con estado `failed`
**And** se emite `LeadSyncFailedEvent`

**Given** un visitante sin datos de contacto (ni email ni teléfono)
**When** su lifecycle cambia a LEAD
**Then** la sincronización no se ejecuta (datos de contacto incompletos)

---

### Story 3.4: Sincronización Automática de Chat a CRM ✅

**Estado:** done

Como comercial,
quiero que cuando se cierra una conversación de chat, los mensajes se sincronicen automáticamente al CRM como notas del lead,
para tener el historial completo de la conversación en LeadCars sin acción manual.

**Implementación:**

- Event Handler: `SyncChatOnChatClosedEventHandler`
  - Escucha: `ChatClosedEvent` (de `conversations-v2`)
  - Condición: config CRM tiene `syncChatConversations` habilitado
  - Obtiene mensajes del chat y genera resumen
  - Mapea sender types: visitante/comercial/bot
  - Despacha: `SyncChatToCrmCommand`
- Command Handler: `SyncChatToCrmCommandHandler`
  - Requiere lead ya sincronizado (`externalLeadId` existente)
  - Verifica que el chat no fue ya sincronizado (idempotencia)
  - Actualiza `CrmSyncRecord.chatsSynced[]`
  - Emite `ChatSyncedToCrmEvent`
- Adapter: `LeadcarsCrmSyncAdapter.syncChat()` mapea a formato `LeadcarsAddChatConversationRequest`

**Acceptance Criteria (verificados):**

**Given** un chat cerrado de un visitante con lead sincronizado en LeadCars
**When** se emite `ChatClosedEvent` y la empresa tiene `syncChatConversations` habilitado
**Then** los mensajes del chat se envían a LeadCars como conversación del lead
**And** se actualiza `CrmSyncRecord.chatsSynced` con el ID del chat

**Given** un chat que ya fue sincronizado
**When** se intenta sincronizar nuevamente
**Then** se previene la duplicación vía `ChatAlreadySyncedError`

**Given** un visitante sin lead sincronizado en el CRM
**When** se cierra su chat
**Then** la sincronización de chat no se ejecuta (requiere `externalLeadId`)

---

### Story 3.5: Tests Unitarios para Sync de Lead y Chat a CRM

**Estado:** backlog

Como desarrollador,
quiero tests unitarios para los command handlers `SyncLeadToCrmCommandHandler` y `SyncChatToCrmCommandHandler` y los event handlers de sincronización,
para asegurar que la lógica de sincronización es correcta y prevenir regresiones.

**Notas:** Actualmente solo existen tests para `SaveLeadContactDataCommandHandler`. Faltan tests para los handlers de sync y los event handlers.

**Acceptance Criteria:**

**Given** `SyncLeadToCrmCommandHandler`
**When** se ejecutan los tests
**Then** cubren: sync exitoso, sync fallido, lead ya sincronizado, datos incompletos, config CRM no encontrada

**Given** `SyncChatToCrmCommandHandler`
**When** se ejecutan los tests
**Then** cubren: sync exitoso, chat ya sincronizado, lead no sincronizado, config sin syncChatConversations

**Given** `SyncLeadOnLifecycleChangedEventHandler`
**When** se ejecutan los tests
**Then** cubren: trigger lifecycle_to_lead, sin config CRM, sin datos de contacto, lifecycle no-LEAD ignorado

**Given** `SyncChatOnChatClosedEventHandler`
**When** se ejecutan los tests
**Then** cubren: chat con config habilitada, config sin syncChatConversations, error al obtener mensajes

---

## Epic 4: Alineación con API LeadCars v2.4

Los tipos, el mapeo de campos y la estructura de datos del adaptador LeadCars deben alinearse con la especificación real de la API v2.4 documentada en `docs/leadcar/LeadCars_API_V2_4.pdf`. Los tipos actuales fueron creados antes de tener la documentación oficial y contienen discrepancias significativas que pueden causar errores en la sincronización de leads.
**FRs cubiertos:** FR-05 (corrección), FR-12 (corrección)
**Nuevos FRs:**

- FR-15: Los campos enviados a LeadCars deben coincidir con los nombres exactos de la API v2.4
- FR-16: El tipo de lead debe ser un ID numérico obtenido de `GET /tipos`
- FR-17: La estructura de chat_conversation debe usar el formato oficial de la API v2.4
- FR-18: (Futuro) El sistema debe soportar el módulo Automagic (journeys/nurturing) de LeadCars v2.4
  **Estado:** backlog

### Story 4.1: Corregir Tipos y Request de Crear Lead

**Estado:** backlog

Como desarrollador,
quiero que los tipos en `leadcars.types.ts` coincidan exactamente con la API real de LeadCars v2.4,
para que la sincronización de leads no falle por nombres de campos incorrectos o tipos de datos erróneos.

**Cambios requeridos en `leadcars.types.ts`:**

1. `LeadcarsCreateLeadRequest`: Renombrar campos y corregir tipos:
   - `concesionario_id: number` → `concesionario: number`
   - `sede_id?: number` → `sede?: number`
   - `campana_id?: number` → `campana?: string` (es código de texto, no numérico)
   - `tipo_lead: LeadcarsTipoLead` → `tipo_lead: number` (ID numérico de GET /tipos)
   - Eliminar: `origen_lead`, `datos_adicionales`, `observaciones`, `dni`, `poblacion`
   - Añadir: `movil?: string`, `cp?: string`, `provincia?: string`, `comentario?: string`, `url_origen?: string`
   - Añadir: `[key: string]: unknown` para campos dinámicos al nivel raíz
2. Eliminar `LeadcarsTipoLead` (string enum) — reemplazar por `number`
3. Eliminar `LeadcarsOrigenLead` — no existe en la API real
4. `LeadcarsConfig`: cambiar `tipoLeadDefault: string` → `tipoLeadDefault: number`, añadir `campanaCode?: string`

**Cambios requeridos en `leadcars-crm-sync.adapter.ts`:**

5. `buildCreateLeadRequest()`: Usar nuevos nombres de campos
6. `validateConfig()`: Eliminar validación contra string enum de tipo_lead
7. Mapear datos adicionales de Guiders como campos dinámicos al nivel raíz (no dentro de `datos_adicionales`)
8. Usar `comentario` en lugar de `observaciones`
9. Mapear `poblacion` a `provincia` y añadir `cp` si hay código postal

**Cambios requeridos en `leadcars-api.service.ts`:**

10. `listCampanas()`: Añadir `concesionarioId` como parámetro requerido en la URL `/campanas/:concesionarioId`

**Acceptance Criteria:**

**Given** el tipo `LeadcarsCreateLeadRequest`
**When** se construye un request para POST /leads
**Then** los campos enviados son exactamente: `nombre`, `apellidos`, `email`, `telefono`, `movil`, `cp`, `provincia`, `comentario`, `url_origen`, `concesionario`, `sede`, `tipo_lead`, `campana` + campos dinámicos al nivel raíz
**And** `tipo_lead` es un número (ID)
**And** `campana` es un string (código)
**And** `concesionario` es un número (ID)
**And** no existen campos `origen_lead`, `datos_adicionales`, `observaciones`, `concesionario_id`, `sede_id`, `campana_id`

**Given** la config de LeadCars con `tipoLeadDefault: 7` (número)
**When** se valida la configuración
**Then** la validación acepta cualquier número positivo como `tipoLeadDefault`
**And** no valida contra un enum de strings

**Given** datos de contacto con campo `poblacion`
**When** se construye el request para LeadCars
**Then** el valor se mapea al campo `provincia` de la API

**Given** la llamada a `listCampanas`
**When** se ejecuta con `concesionarioId: 123`
**Then** la URL de la petición es `/campanas/123`

**Given** datos adicionales de Guiders (visitor_id, company_id)
**When** se incluyen en el request
**Then** se envían como campos dinámicos al nivel raíz: `guiders_visitor_id`, `guiders_company_id`

---

### Story 4.2: Alinear Estructura de Chat Conversation con API v2.4

**Estado:** backlog

Como desarrollador,
quiero que el formato de la conversación de chat enviada a LeadCars use la estructura oficial de la API v2.4,
para que las conversaciones se registren correctamente en el CRM.

**Cambios requeridos:**

1. **Tipos**: Reemplazar `LeadcarsAddChatConversationRequest` por la estructura real:
   - Campo `chat` con `chat_id`, `users[]`, `messages[]`
   - `users[]`: cada usuario con `_id` y sub-objeto `user` o `visitor`
   - `messages[]`: con `_id`, `message: {text, type}`, `created_at` (ISO 8601), `user_sender`, `interaction_type`
2. Eliminar campos inventados: `conversacion`, `fecha_inicio`, `fecha_fin`, `resumen`, `metadata`
3. **Adapter**: `convertMessagesToLeadcarsFormat()` debe generar la estructura real
4. **Adapter**: Añadir lógica para construir el array `users[]` con datos del visitor y del comercial
5. **Tipos de interacción**: Mapear mensajes de guiders a `interaction_type`: `welcome | default | close`

**Acceptance Criteria:**

**Given** una conversación de chat cerrada con 5 mensajes
**When** se sincroniza con LeadCars
**Then** el payload enviado a `POST /leads/{id}/chat_conversation` tiene la estructura:

```json
{
  "chat": {
    "chat_id": "...",
    "users": [{"_id": "...", "user": {...}}, {"_id": "...", "visitor": {...}}],
    "messages": [{"_id": "...", "message": {"text": "...", "type": "text"}, "created_at": "ISO 8601", "user_sender": "...", "interaction_type": "default"}]
  }
}
```

**Given** el primer mensaje de la conversación (welcome)
**When** se mapea al formato LeadCars
**Then** el `interaction_type` es `"welcome"`

**Given** el último mensaje antes del cierre
**When** se mapea al formato LeadCars
**Then** el `interaction_type` es `"close"`

**Given** mensajes intermedios
**When** se mapean al formato LeadCars
**Then** el `interaction_type` es `"default"`

---

### Story 4.3: Validación de Formato E.164 para Teléfonos

**Estado:** backlog

Como desarrollador,
quiero que los teléfonos se validen y formateen en E.164 antes de enviarlos a LeadCars,
para cumplir con el formato obligatorio de la API v2.4.

**Acceptance Criteria:**

**Given** un teléfono `612345678` (sin prefijo)
**When** se construye el request para LeadCars
**Then** se envía como `+34612345678` (asumiendo España como país por defecto configurable)

**Given** un teléfono `+34612345678` (ya con prefijo)
**When** se construye el request
**Then** se envía tal cual

**Given** un teléfono con formato no E.164 (ej: `612 34 56 78`, `612-345-678`)
**When** se construye el request
**Then** se normaliza a `+34612345678`

**Given** datos de contacto con campo `telefono` y sin campo `movil`
**When** se envía a LeadCars
**Then** solo se incluye el campo `telefono`
**And** el campo `movil` no se incluye en el request

---

### Story 4.4: Actualizar Tipos de Response y Comentarios

**Estado:** backlog

Como desarrollador,
quiero que los tipos de response y el endpoint de comentarios coincidan con la API real v2.4,
para que el manejo de respuestas sea correcto.

**Cambios requeridos:**

1. **`LeadcarsCreateLeadResponse`**: Verificar en sandbox el formato real de la respuesta (no está documentado en el PDF oficial)
2. **`LeadcarsAddCommentRequest`**: Simplificar a solo `{ comentario: string }` — eliminar `tipo` y `privado` que no existen en la API
3. **`LeadcarsAddCommentResponse`**: Verificar formato real en sandbox
4. **Responses de discovery** (`concesionarios`, `sedes`, `campañas`, `tipos`): Verificar formato real en sandbox
5. Eliminar `LeadcarsErrorResponse` si el formato real es diferente

**Acceptance Criteria:**

**Given** el tipo `LeadcarsAddCommentRequest`
**When** se usa para registrar un comentario
**Then** solo contiene el campo `comentario: string`
**And** no contiene `tipo`, `privado`, ni `lead_id` (el lead_id va en la URL)

**Given** las responses de discovery (concesionarios, sedes, campañas, tipos)
**When** se reciben de la API
**Then** los tipos de TypeScript mapean correctamente la estructura real

---

### Story 4.5: Integración con Módulo Automagic (Journeys)

**Estado:** backlog

Como administrador,
quiero poder asignar leads sincronizados a flujos de nurturing (Automagic) de LeadCars,
para automatizar el seguimiento de leads tras su captura inicial.

> **IMPORTANTE**: Automagic es un módulo opcional. No todos los clientes lo tienen contratado.
> Este módulo usa autenticación diferente: headers `api-user` (email) + `api-token`.

**Cambios requeridos:**

1. **Tipos nuevos**: `LeadcarsJourney`, `LeadcarsJourneyLeadStatus`, requests y responses
2. **Config**: Añadir campos opcionales `automagicUser` y `automagicToken` a `LeadcarsConfig`
3. **API Service**: Nuevos métodos `listJourneys()`, `addLeadToJourney()`, `getLeadJourneys()`
4. **Adapter**: Método `assignToJourney()` en `ICrmSyncService` (extensión de interfaz)
5. **Config CRM**: Nuevo campo opcional `defaultJourneyId` para auto-asignación

**Acceptance Criteria:**

**Given** una empresa con Automagic contratado y configurado (`automagicUser` + `automagicToken`)
**When** un lead se sincroniza exitosamente con LeadCars
**And** la config tiene `defaultJourneyId` definido
**Then** el lead se asigna automáticamente al flujo configurado

**Given** una llamada a `listJourneys`
**When** se ejecuta con credenciales Automagic válidas
**Then** retorna la lista de flujos disponibles con `id` y `title`

**Given** un lead que ya pasó por un flujo
**When** se intenta asignar al mismo flujo
**Then** se recibe `409 CONFLICT` y se maneja sin error fatal

**Given** una empresa sin Automagic contratado (sin `automagicUser`/`automagicToken`)
**When** se intenta usar funcionalidades de Automagic
**Then** se ignora silenciosamente (no es un error)

---

### Story 4.6: Tests E2E contra Sandbox de LeadCars

**Estado:** backlog

Como desarrollador,
quiero tests de integración contra el sandbox de LeadCars para verificar que los tipos y el mapeo de campos son correctos,
para detectar discrepancias antes de llegar a producción.

**Acceptance Criteria:**

**Given** credenciales de sandbox válidas (configuradas en variables de entorno de test)
**When** se ejecuta `POST /leads` con un payload construido por `buildCreateLeadRequest`
**Then** LeadCars sandbox acepta el lead sin errores de validación

**Given** un lead creado en sandbox
**When** se ejecuta `POST /leads/{id}/chat_conversation` con la nueva estructura
**Then** LeadCars sandbox acepta la conversación

**Given** un lead creado en sandbox
**When** se ejecuta `POST /leads/{id}/comments` con `{ comentario: "test" }`
**Then** LeadCars sandbox acepta el comentario

**Given** credenciales de sandbox válidas
**When** se ejecutan las llamadas de discovery (concesionarios, sedes, campañas, tipos)
**Then** las responses parsean correctamente con los tipos TypeScript
