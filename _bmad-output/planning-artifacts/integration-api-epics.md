---
stepsCompleted:
  [
    step-01-validate-prerequisites,
    step-02-design-epics,
    step-03-create-stories,
    step-04-final-validation,
  ]
inputDocuments:
  - AGENTS.md
  - src/context/auth/integration-api-key/
  - src/context/conversations-v2/
  - src/context/leads/
  - docs/api-contracts.md
sessionDecisions:
  - Integration API Keys son para backends externos server-to-server
  - SDK del widget usa sistema separado (X-Guiders-Sid)
  - Endpoints propios bajo /api/integration/ — no reutilizar endpoints del SDK
  - IntegrationApiKeyGuard directo sobre el controller (sin UnifiedAuthGuard)
  - companyId y channel son prerequisito obligatorio en el aggregate Chat
  - Política de conversación duplicada hardcoded para el MVP
lastUpdated: 2026-04-23
---

# guiders-backend — Integration API Layer: Epic Breakdown

## Resumen

Este documento desglosa las épicas y stories para la **Integration API Layer** de Guiders: una capa de endpoints REST dedicada (`/api/integration/...`) que permite a backends externos autenticarse con Integration API Keys (`gdr_live_xxx`) y operar sobre conversaciones y visitantes de forma programática, sin intervención de usuario.

---

## Inventario de Requisitos

### Requisitos Funcionales

FR-01: El aggregate `Chat` debe persistir el campo `companyId` para garantizar aislamiento multi-tenant.

FR-02: El aggregate `Chat` debe persistir el campo `channel` (`chat | email | whatsapp`) para identificar el origen de la conversación.

FR-03: El módulo `IntegrationModule` debe exponer un controller bajo el prefijo `/api/integration` protegido con `IntegrationApiKeyGuard`.

FR-04: `POST /api/integration/conversations` debe crear una nueva conversación asociando `companyId` desde la API key (nunca del body).

FR-05: `POST /api/integration/conversations` debe devolver `409 Conflict` si el visitante ya tiene una conversación activa (`PENDING | ASSIGNED | ACTIVE | TRANSFERRED`) para el mismo `companyId`.

FR-06: `POST /api/integration/conversations/:id/messages` debe añadir un mensaje a una conversación existente.

FR-07: `POST /api/integration/conversations/:id/messages` debe soportar idempotencia mediante el campo opcional `externalMessageId`.

FR-08: `GET /api/integration/conversations/:id` debe devolver el estado de la conversación y opcionalmente el historial de mensajes paginado.

FR-09: Todos los endpoints deben verificar que el recurso pertenece al `companyId` del API key — devolviendo `403` si no coincide.

FR-10: El repositorio `ChatRepository` debe exponer el método `findActiveByVisitorAndCompany(visitorId, companyId)` para soportar la validación de duplicados.

FR-11: El índice MongoDB `{ companyId: 1, visitorId: 1, status: 1 }` debe existir para eficiencia de queries.

### Requisitos No Funcionales

NFR-01: Un request sin `x-api-key` o con key inválida debe devolver `401` en < 50ms.

NFR-02: El `companyId` debe provenir **siempre** de `req.integrationApiKey.companyId` — nunca aceptarse en el body de la request.

NFR-03: Las keys `gdr_test_xxx` deben producir conversaciones marcadas con `isTest: true` y sin eventos WebSocket reales.

NFR-04: `npm run lint`, `npm run build` y `npm run test:unit` deben pasar sin errores tras cada story.

NFR-05: Todos los tests deben usar `Uuid.random().value` para IDs — nunca strings hardcodeados.

NFR-06: Aplicar el patrón `Result<T, E>` en todos los repositorios y handlers de la capa de integración.

### Requisitos de Arquitectura

- Nuevo contexto `src/context/integration/` — solo capa de infraestructura (adaptador), sin domain/application propios
- `IntegrationApiKeyGuard` aplicado a nivel de clase en el controller — sin `UnifiedAuthGuard`
- Reutilizar commands/queries de `conversations-v2` cuando sea posible
- Interfaz `RequestWithIntegrationApiKey` tipada en `src/context/auth/integration-api-key/infrastructure/`
- `IntegrationModule` registrado en `AppModule`
- Tag Swagger `integration` añadido a la configuración pública

### Mapa de Cobertura de Requisitos

| Requisito | Épica | Story |
|-----------|-------|-------|
| FR-01 | Epic 1 | Story 1.1 |
| FR-02 | Epic 1 | Story 1.2 |
| FR-03 | Epic 2 | Story 2.1 |
| FR-04 | Epic 2 | Story 2.2 |
| FR-05 | Epic 2 | Story 2.2 |
| FR-06 | Epic 2 | Story 2.3 |
| FR-07 | Epic 2 | Story 2.3 |
| FR-08 | Epic 2 | Story 2.4 |
| FR-09 | Epic 2 | Stories 2.2, 2.3, 2.4 |
| FR-10 | Epic 1 | Story 1.3 |
| FR-11 | Epic 1 | Story 1.1 |
| NFR-01–06 | Transversal | Todos |

---

## Lista de Épicas

- **Epic 1**: Prerequisitos de Dominio — `companyId`, `channel` e índices en `Chat`
- **Epic 2**: Integration API Layer MVP — endpoints `/api/integration/...`

---

## Epic 1: Prerequisitos de Dominio en el Aggregate Chat

**Objetivo:** Añadir los campos `companyId` y `channel` al aggregate `Chat` del contexto `conversations-v2`, junto con los índices MongoDB y métodos de repositorio necesarios para garantizar aislamiento multi-tenant y soporte de la Integration API. Este trabajo debe completarse antes de implementar Epic 2.

---

### Story 1.1: Añadir `companyId` al aggregate `Chat` y al schema MongoDB

Como desarrollador de la Integration API,
quiero que el aggregate `Chat` persista el `companyId`,
para que todos los endpoints de integración puedan garantizar aislamiento multi-tenant.

**Acceptance Criteria:**

**Given** el aggregate `Chat` en `src/context/conversations-v2/domain/entities/chat.aggregate.ts`
**When** se crea un nuevo `Chat` via `Chat.createPendingChat()`
**Then** el campo `companyId` se persiste en el aggregate y en MongoDB
**And** el campo `companyId` es obligatorio en el constructor y en `fromPrimitives()`
**And** el campo `companyId` se incluye en `toPrimitives()`

**Given** el schema MongoDB en `src/context/conversations-v2/infrastructure/schemas/chat.schema.ts`
**When** se persiste un `Chat`
**Then** el campo `company_id` existe en el documento MongoDB con tipo `String`
**And** existe el índice compuesto `{ companyId: 1, visitorId: 1, status: 1 }` (no único)
**And** el TODO `companyId: 'TODO'` en `ChatCreatedEvent` queda resuelto con el valor real

**Given** el mapper `ChatMapper`
**When** se mapea de persistence a dominio y viceversa
**Then** `companyId` se mapea correctamente en ambas direcciones

**Given** los tests unitarios existentes del aggregate `Chat`
**When** se ejecuta `npm run test:unit`
**Then** todos los tests pasan, incluyendo los nuevos que cubren `companyId`

---

### Story 1.2: Añadir `channel` al aggregate `Chat`

Como desarrollador de la Integration API,
quiero que el aggregate `Chat` persista el canal de origen (`chat | email | whatsapp`),
para que los endpoints de integración puedan crear conversaciones con canal explícito.

**Acceptance Criteria:**

**Given** el aggregate `Chat`
**When** se crea un nuevo `Chat`
**Then** el campo `channel` acepta valores `'chat' | 'email' | 'whatsapp'`
**And** el valor por defecto es `'chat'` cuando no se especifica
**And** `channel` se incluye en `toPrimitives()` y `fromPrimitives()`

**Given** el value object `ChatChannel` en `src/context/conversations-v2/domain/value-objects/`
**When** se instancia con un valor inválido
**Then** se retorna `err(new InvalidChatChannelError(value))`

**Given** el schema MongoDB
**When** se persiste un `Chat`
**Then** el campo `channel` existe con tipo `String` y enum `['chat', 'email', 'whatsapp']`

**Given** el mapper `ChatMapper`
**When** se mapea de persistence a dominio y viceversa
**Then** `channel` se mapea correctamente en ambas direcciones

**Given** `npm run test:unit`
**When** se ejecuta
**Then** todos los tests pasan, incluyendo los nuevos del value object `ChatChannel`

---

### Story 1.3: Método `findActiveByVisitorAndCompany` en el repositorio Chat

Como handler de creación de conversaciones,
quiero poder consultar si un visitante ya tiene una conversación activa en una empresa,
para implementar la política de deduplicación hardcoded del MVP.

**Acceptance Criteria:**

**Given** la interfaz `IChatRepository` en `src/context/conversations-v2/domain/chat.repository.ts`
**When** se añade el método `findActiveByVisitorAndCompany`
**Then** la firma es: `findActiveByVisitorAndCompany(visitorId: string, companyId: string): Promise<Result<Chat | null, DomainError>>`

**Given** la implementación `MongoChatRepositoryImpl`
**When** se llama `findActiveByVisitorAndCompany(visitorId, companyId)`
**Then** se busca en MongoDB un `Chat` con `visitorId`, `companyId` y `status` en `['PENDING', 'ASSIGNED', 'ACTIVE', 'TRANSFERRED']`
**And** devuelve `ok(chat)` si existe o `ok(null)` si no existe
**And** usa el índice `{ companyId, visitorId, status }` creado en Story 1.1

**Given** un test unitario mockeando el modelo Mongoose
**When** existe un chat activo para ese visitante y empresa
**Then** el método devuelve `ok(chat)`

**When** no existe ningún chat activo
**Then** el método devuelve `ok(null)`

---

## Epic 2: Integration API Layer MVP

**Objetivo:** Construir la capa de endpoints REST bajo `/api/integration/...` que permite a backends externos autenticarse con Integration API Keys y operar sobre conversaciones. Prerequisito: Epic 1 completada.

---

### Story 2.1: Módulo e infraestructura base de Integration API

Como desarrollador externo,
quiero que exista el módulo `IntegrationModule` registrado en la aplicación,
para que los endpoints de integración estén disponibles y protegidos.

**Acceptance Criteria:**

**Given** el archivo `src/context/integration/integration.module.ts`
**When** la aplicación arranca
**Then** el módulo `IntegrationModule` está registrado en `AppModule`
**And** el módulo importa `IntegrationApiKeyModule` y `CqrsModule`

**Given** la interfaz `RequestWithIntegrationApiKey` en `src/context/auth/integration-api-key/infrastructure/request-with-integration-api-key.interface.ts`
**When** el guard procesa una request válida
**Then** `req.integrationApiKey` tiene tipo `{ id: string; companyId: string; environment: 'live' | 'test' }`

**Given** el controller `IntegrationController` decorado con `@Controller('integration')` y `@UseGuards(IntegrationApiKeyGuard)`
**When** se hace cualquier request sin header `x-api-key`
**Then** la respuesta es `401 Unauthorized`

**When** se hace cualquier request con API key inválida o revocada
**Then** la respuesta es `401 Unauthorized`

**Given** `npm run build`
**When** se ejecuta
**Then** compila sin errores

---

### Story 2.2: `POST /api/integration/conversations` — Crear conversación

Como backend externo autenticado con API key,
quiero crear una conversación para un visitante,
para que mi sistema pueda iniciar interacciones proactivas sin intervención del browser.

**Acceptance Criteria:**

**Given** una request `POST /api/integration/conversations` con API key válida
**When** el body es `{ visitorId: "<uuid>", message: "<texto>", metadata?: {} }`
**Then** se crea la conversación con `companyId` tomado de `req.integrationApiKey.companyId`
**And** la respuesta es `201 Created` con `{ conversationId, status, visitorId, createdAt }`
**And** el campo `companyId` en el body es ignorado aunque se envíe

**Given** una request con `visitorId` que no existe en el sistema
**When** se procesa
**Then** la respuesta es `404 Not Found` con `{ error: 'VISITOR_NOT_FOUND' }`

**Given** una request con un `visitorId` que ya tiene una conversación con status `PENDING | ASSIGNED | ACTIVE | TRANSFERRED` en el mismo `companyId`
**When** se procesa
**Then** la respuesta es `409 Conflict` con `{ error: 'ACTIVE_CONVERSATION_EXISTS', conversationId: "<id_existente>" }`

**Given** una request sin campo `visitorId`
**When** se procesa
**Then** la respuesta es `400 Bad Request`

**Given** una API key `gdr_test_xxx`
**When** se crea la conversación
**Then** la conversación se persiste con `isTest: true`
**And** no se emiten eventos WebSocket

**Given** `npm run test:unit`
**When** se ejecuta
**Then** existen tests que cubren los 5 escenarios anteriores mockeando CommandBus y el repositorio

---

### Story 2.3: `POST /api/integration/conversations/:id/messages` — Enviar mensaje

Como backend externo autenticado con API key,
quiero enviar un mensaje a una conversación existente,
para que mi sistema pueda automatizar respuestas o notificaciones dentro de una conversación.

**Acceptance Criteria:**

**Given** una request `POST /api/integration/conversations/:id/messages` con API key válida
**When** el body es `{ content: "<texto>", contentType: "text", senderType?: "bot" }`
**Then** la respuesta es `201 Created` con `{ messageId, conversationId, content, contentType, senderType, sentAt }`

**Given** una request con `externalMessageId` en el body
**When** ya existe un mensaje con ese `externalMessageId` para el mismo `companyId`
**Then** la respuesta es `200 OK` con el payload del mensaje original (idempotencia)

**Given** una request donde `:id` no existe en MongoDB
**When** se procesa
**Then** la respuesta es `404 Not Found` con `{ error: 'CONVERSATION_NOT_FOUND' }`

**Given** una request donde `:id` pertenece a un `companyId` diferente al del API key
**When** se procesa
**Then** la respuesta es `403 Forbidden` con `{ error: 'FORBIDDEN' }`

**Given** una conversación con status `CLOSED`
**When** se intenta enviar un mensaje
**Then** la respuesta es `422 Unprocessable Entity` con `{ error: 'CONVERSATION_CLOSED' }`

**Given** un body con `content` vacío o `contentType` inválido
**When** se procesa
**Then** la respuesta es `400 Bad Request`

**Given** `npm run test:unit`
**When** se ejecuta
**Then** los 6 escenarios anteriores están cubiertos por tests unitarios

---

### Story 2.4: `GET /api/integration/conversations/:id` — Leer conversación

Como backend externo autenticado con API key,
quiero consultar el estado e historial de una conversación,
para que mi sistema pueda sincronizar el estado hacia mi CRM o sistema de reporting.

**Acceptance Criteria:**

**Given** una request `GET /api/integration/conversations/:id` con API key válida
**When** la conversación pertenece al `companyId` del API key
**Then** la respuesta es `200 OK` con `{ conversationId, status, channel, visitorId, assignedAgentId, createdAt, updatedAt }`
**And** el campo `messages` está **ausente** en el response por defecto

**Given** una request con query param `includeMessages=true`
**When** se procesa
**Then** el response incluye `messages: [{ messageId, content, contentType, senderType, sentAt }]`
**And** los mensajes están ordenados por `sentAt ASC`
**And** el response incluye `pagination: { hasMore, nextCursor }`

**Given** una request con `messagesLimit=250`
**When** se procesa
**Then** la respuesta es `400 Bad Request` — el límite máximo es 200

**Given** una request donde `:id` no existe
**When** se procesa
**Then** la respuesta es `404 Not Found`

**Given** una request donde `:id` pertenece a un `companyId` diferente al del API key
**When** se procesa
**Then** la respuesta es `403 Forbidden`

**Given** una conversación creada con `gdr_test_xxx`
**When** se consulta con cualquier API key (live o test)
**Then** el response incluye `"isTest": true`

**Given** `npm run test:unit`
**When** se ejecuta
**Then** los 6 escenarios anteriores están cubiertos por tests unitarios
