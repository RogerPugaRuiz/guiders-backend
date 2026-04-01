# Historia 3.5: Tests Unitarios para Sync de Lead y Chat a CRM

Status: ready-for-dev

## Historia

Como desarrollador,
quiero tests unitarios para los command handlers `SyncLeadToCrmCommandHandler` y `SyncChatToCrmCommandHandler` y los event handlers de sincronización,
para asegurar que la lógica de sincronización es correcta y prevenir regresiones.

## Criterios de Aceptación

1. **Dado** `SyncLeadToCrmCommandHandler`
   **Cuando** se ejecutan los tests
   **Entonces** cubren: sync exitoso, sync fallido, lead ya sincronizado, datos de contacto no encontrados, config CRM no encontrada/vacía

2. **Dado** `SyncChatToCrmCommandHandler`
   **Cuando** se ejecutan los tests
   **Entonces** cubren: sync exitoso, chat ya sincronizado, lead no sincronizado (sin externalLeadId), config sin syncChatConversations, error al marcar chat sincronizado

3. **Dado** `SyncLeadOnLifecycleChangedEventHandler`
   **Cuando** se ejecutan los tests
   **Entonces** cubren: lifecycle → LEAD con trigger configurado, sin config CRM, sin datos de contacto, lifecycle no-LEAD (ignorado), visitante sin tenantId

4. **Dado** `SyncChatOnChatClosedEventHandler`
   **Cuando** se ejecutan los tests
   **Entonces** cubren: chat cerrado con config habilitada, config sin syncChatConversations, error al obtener mensajes, chat sin mensajes

5. **Dado** cualquiera de los tests anteriores
   **Cuando** se ejecuta `npm run test:unit`
   **Entonces** todos los tests pasan sin errores y sin mocks incompletos

## Tareas / Subtareas

- [ ] Crear `__tests__/sync-lead-to-crm-command.handler.spec.ts` (AC: 1)
  - [ ] Mock: `ILeadContactDataRepository`, `ICrmSyncRecordRepository`, `ICrmCompanyConfigRepository`, `ICrmSyncServiceFactory`, `EventBus`
  - [ ] Test: sync exitoso — crea CrmSyncRecord con estado 'synced' y publica `LeadSyncedToCrmEvent`
  - [ ] Test: sync fallido — CrmSyncRecord con estado 'failed' y publica `LeadSyncFailedEvent`
  - [ ] Test: lead ya sincronizado — retorna éxito sin llamar al adapter
  - [ ] Test: contactData no encontrado — retorna `LeadContactDataNotFoundError`
  - [ ] Test: sin configs CRM habilitadas — retorna `CrmNotConfiguredError`
- [ ] Crear `__tests__/sync-chat-to-crm-command.handler.spec.ts` (AC: 2)
  - [ ] Mock: `ICrmSyncRecordRepository`, `ICrmCompanyConfigRepository`, `ICrmSyncServiceFactory`, `EventBus`
  - [ ] Test: sync exitoso — publica `ChatSyncedToCrmEvent` y marca chat como sincronizado
  - [ ] Test: chat ya sincronizado — retorna `skipped: true` sin llamar al adapter
  - [ ] Test: lead no sincronizado (sin externalLeadId) — retorna `skipped: true, skipReason: 'Lead no sincronizado con este CRM'`
  - [ ] Test: config sin `syncChatConversations` — retorna array vacío sin llamar al adapter
  - [ ] Test: fallo en `adapter.syncChat()` — retorna error con details
- [ ] Crear `__tests__/sync-lead-on-lifecycle-changed.event-handler.spec.ts` (AC: 3)
  - [ ] Mock: `CommandBus`, `VisitorV2Repository`, `ICrmCompanyConfigRepository`, `ILeadContactDataRepository`
  - [ ] Test: lifecycle → LEAD, con trigger `lifecycle_to_lead` y datos de contacto → ejecuta `SyncLeadToCrmCommand`
  - [ ] Test: lifecycle → LEAD pero sin config CRM → no ejecuta command
  - [ ] Test: lifecycle → LEAD pero sin datos de contacto → no ejecuta command
  - [ ] Test: lifecycle → LEAD, datos de contacto sin email ni teléfono → no ejecuta command
  - [ ] Test: lifecycle es VISITOR (no-LEAD) → ignora el evento completamente
  - [ ] Test: visitante sin tenantId → no ejecuta command
- [ ] Crear `__tests__/sync-chat-on-chat-closed.event-handler.spec.ts` (AC: 4)
  - [ ] Mock: `CommandBus`, `VisitorV2Repository`, `IChatRepository`, `IMessageRepository`, `ICrmCompanyConfigRepository`
  - [ ] Test: chat cerrado, config con syncChatConversations, mensajes → ejecuta `SyncChatToCrmCommand`
  - [ ] Test: config sin syncChatConversations → no ejecuta command
  - [ ] Test: error al obtener mensajes → no ejecuta command (no propaga error)
  - [ ] Test: chat sin mensajes → no ejecuta command
- [ ] Verificar que todos los tests pasan con `npm run test:unit` (AC: 5)

## Notas de Desarrollo

### Patrón de referencia — test existente

Usar `save-lead-contact-data-command.handler.spec.ts` como plantilla:

- `src/context/leads/application/commands/__tests__/save-lead-contact-data-command.handler.spec.ts`
- Módulo NestJS con `Test.createTestingModule`
- Mocks: `jest.Mocked<T>`
- UUIDs reales: `Uuid.random().value` (NUNCA strings fake como `'visitor-id'`)
- Describe en español, assertions en inglés

### Archivos a crear

```
src/context/leads/application/commands/__tests__/
├── save-lead-contact-data-command.handler.spec.ts   (existente, referencia)
├── sync-lead-to-crm-command.handler.spec.ts         (nuevo)
└── sync-chat-to-crm-command.handler.spec.ts         (nuevo)

src/context/leads/application/events/__tests__/
├── sync-lead-on-lifecycle-changed.event-handler.spec.ts  (nuevo)
└── sync-chat-on-chat-closed.event-handler.spec.ts        (nuevo)
```

### Mocks necesarios para SyncLeadToCrmCommandHandler

```typescript
// Interfaces a mockear
import {
  ILeadContactDataRepository,
  LEAD_CONTACT_DATA_REPOSITORY,
} from '../../../domain/lead-contact-data.repository';
import {
  ICrmSyncRecordRepository,
  CRM_SYNC_RECORD_REPOSITORY,
} from '../../../domain/crm-sync-record.repository';
import {
  ICrmCompanyConfigRepository,
  CRM_COMPANY_CONFIG_REPOSITORY,
} from '../../../domain/crm-company-config.repository';
import {
  ICrmSyncServiceFactory,
  CRM_SYNC_SERVICE_FACTORY,
  ICrmSyncService,
} from '../../../domain/services/crm-sync.service';

// Estructura del módulo de test
await Test.createTestingModule({
  providers: [
    SyncLeadToCrmCommandHandler,
    { provide: LEAD_CONTACT_DATA_REPOSITORY, useValue: contactDataRepo },
    { provide: CRM_SYNC_RECORD_REPOSITORY, useValue: syncRecordRepo },
    { provide: CRM_COMPANY_CONFIG_REPOSITORY, useValue: configRepo },
    { provide: CRM_SYNC_SERVICE_FACTORY, useValue: crmFactory },
    { provide: EventBus, useValue: eventBus },
  ],
}).compile();
```

### Estructura del SyncLeadResult para mocks exitosos

```typescript
// Cuando adapter.syncLead() tiene éxito:
mockAdapter.syncLead.mockResolvedValue(
  ok({
    externalLeadId: '12345',
    metadata: { referencia: 'REF-001', estado: 'nuevo' },
  }),
);
```

### Estructura del CrmCompanyConfigPrimitives para mocks

```typescript
const mockConfig: CrmCompanyConfigPrimitives = {
  id: Uuid.random().value,
  companyId,
  crmType: 'leadcars',
  enabled: true,
  syncChatConversations: true,
  triggerEvents: ['lifecycle_to_lead', 'chat_closed'],
  config: {
    clienteToken: 'test-token-12345678901',
    useSandbox: true,
    concesionarioId: 1,
    tipoLeadDefault: 7,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### Mock de VisitorV2Repository para event handlers

```typescript
const visitor = {
  toPrimitives: () => ({ tenantId: companyId, id: visitorId }),
};
visitorRepo.findById.mockResolvedValue(ok(visitor));
```

### Notas de comportamiento a verificar

**SyncLeadToCrmCommandHandler — lead ya sincronizado:**

- `syncRecordRepository.findByVisitorId` devuelve record con `status: 'synced'` y `externalLeadId` definido
- El handler retorna éxito sin llamar a `crmServiceFactory.getAdapter()` ni `adapter.syncLead()`

**SyncChatToCrmCommandHandler — chat ya sincronizado:**

- `syncRecordRepository.isChatSynced` devuelve `ok(true)`
- Retorna `{ crmType, success: true, skipped: true, skipReason: 'Chat ya sincronizado' }`

**SyncLeadOnLifecycleChangedEventHandler — lifecycle no-LEAD:**

- `event.attributes.newLifecycle` es `'VISITOR'` o cualquier valor distinto de `'LEAD'`
- El handler retorna sin ejecutar ninguna consulta adicional

### Comandos para ejecutar tests

```bash
# Todos los tests de leads
npm run test:unit -- src/context/leads

# Archivo específico
npm run test:unit -- src/context/leads/application/commands/__tests__/sync-lead-to-crm-command.handler.spec.ts
```

### Referencias

- Test de referencia: `src/context/leads/application/commands/__tests__/save-lead-contact-data-command.handler.spec.ts`
- Handler lead sync: `src/context/leads/application/commands/sync-lead-to-crm-command.handler.ts`
- Handler chat sync: `src/context/leads/application/commands/sync-chat-to-crm-command.handler.ts`
- Event handler lifecycle: `src/context/leads/application/events/sync-lead-on-lifecycle-changed.event-handler.ts`
- Event handler chat closed: `src/context/leads/application/events/sync-chat-on-chat-closed.event-handler.ts`
- Errores de dominio: `src/context/leads/domain/errors/leads.error.ts`
- Eventos: `src/context/leads/domain/events/lead-synced.event.ts`

## Registro del Agente Dev

### Modelo Utilizado

claude-sonnet-4.6 (github-copilot/claude-sonnet-4.6)

### Notas de Completación

### Lista de Ficheros
