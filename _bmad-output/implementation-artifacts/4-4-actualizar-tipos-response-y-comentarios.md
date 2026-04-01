# Historia 4.4: Actualizar Tipos de Response y Comentarios

Status: ready-for-dev

## Historia

Como desarrollador,
quiero que los tipos de response de LeadCars y el request de comentarios coincidan con la API real v2.4,
para que el manejo de respuestas sea correcto y no se envíen campos inexistentes.

## Criterios de Aceptación

1. **Dado** el tipo `LeadcarsAddCommentRequest`
   **Cuando** se usa para registrar un comentario en `POST /leads/{idLead}/comments`
   **Entonces** solo contiene el campo `comentario: string`
   **Y** no contiene `tipo`, `privado`, ni `lead_id` (el lead_id va en la URL)

2. **Dado** la llamada a `apiService.addComment(leadId, { comentario: 'texto' }, config)`
   **Cuando** se ejecuta
   **Entonces** el body enviado a LeadCars es exactamente `{ "comentario": "texto" }`
   **Y** el `leadId` se usa solo en la URL `/leads/{leadId}/comments`

3. **Dado** el tipo `LeadcarsCreateLeadResponse`
   **Cuando** se define
   **Entonces** refleja que la respuesta real de la API es opaca (puede ser cualquier objeto con `success: boolean`)
   **Y** los campos `data.referencia`, `data.estado`, `data.created_at`, `data.updated_at` se marcan como opcionales

4. **Dado** el tipo `LeadcarsAddCommentResponse`
   **Cuando** se define
   **Entonces** refleja que la respuesta puede ser cualquier objeto con `success: boolean`
   **Y** los campos en `data` se marcan como opcionales o se simplifica a `data?: Record<string, unknown>`

5. **Dado** las responses de discovery (`LeadcarsListConcesionariosResponse`, `LeadcarsListSedesResponse`, `LeadcarsListCampanasResponse`, `LeadcarsListTiposResponse`)
   **Cuando** se definen
   **Entonces** el wrapper de respuesta es consistente: `{ data: T[] }` (sin campo `success` ni `error` si la API real no los usa)

6. **Dado** el tipo `LeadcarsErrorResponse`
   **Cuando** se evalúa si es necesario
   **Entonces** se mantiene o elimina según si la API real devuelve ese formato exacto

## Tareas / Subtareas

- [ ] Simplificar `LeadcarsAddCommentRequest` en `leadcars.types.ts` (AC: 1)
  - [ ] Dejar solo `{ comentario: string }` — eliminar `tipo`, `privado`, `lead_id`
- [ ] Actualizar `addComment()` en `leadcars-api.service.ts` (AC: 2)
  - [ ] Cambiar firma: `request: { comentario: string }` en lugar de `Omit<LeadcarsAddCommentRequest, 'lead_id'>`
  - [ ] El body enviado debe ser solo `{ comentario: texto }` sin construir un objeto con `lead_id`
  - [ ] Eliminar el spread `{ ...request, lead_id: leadId }` — enviar `{ comentario: request.comentario }` directamente
- [ ] Actualizar `LeadcarsCreateLeadResponse` (AC: 3)
  - [ ] Marcar todos los campos de `data` como opcionales: `id?: number`, `referencia?: string`, `estado?: string`, `created_at?: string`, `updated_at?: string`
  - [ ] Mantener `success: boolean` como campo principal
- [ ] Actualizar `LeadcarsAddCommentResponse` (AC: 4)
  - [ ] Simplificar `data` a `data?: Record<string, unknown>` o mantener campos como opcionales
- [ ] Revisar y ajustar `LeadcarsAddConversationResponse` (AC: 4)
  - [ ] Marcar `data` como opcional y sus campos como opcionales
- [ ] Actualizar `adapter.syncLead()` para tolerar `data` ausente en la response (AC: 3)
  - [ ] Si `response.data?.id` es `undefined`, usar un fallback como `'unknown'` o loguear una advertencia
  - [ ] Si `response.data?.referencia` o `estado` no existen, omitirlos del metadata
- [ ] Ejecutar tests unitarios existentes: `npm run test:unit -- src/context/leads`

## Notas de Desarrollo

### `LeadcarsAddCommentRequest` — antes vs después

```typescript
// ANTES (campos inventados):
export interface LeadcarsAddCommentRequest {
  lead_id: number; // ❌ va en la URL, no en el body
  comentario: string;
  tipo?: 'NOTA' | 'SEGUIMIENTO' | 'IMPORTANTE'; // ❌ no existe en API
  privado?: boolean; // ❌ no existe en API
}

// DESPUÉS (solo lo que acepta la API real):
export interface LeadcarsAddCommentRequest {
  comentario: string; // ✅ único campo del body
}
```

### `addComment()` en `leadcars-api.service.ts` — antes vs después

```typescript
// ANTES:
async addComment(
  leadId: number,
  request: Omit<LeadcarsAddCommentRequest, 'lead_id'>,
  config: LeadcarsConfig,
): Promise<Result<LeadcarsAddCommentResponse, DomainError>> {
  const url = `${this.getBaseUrl(config)}/leads/${leadId}/comments`;
  const payload: LeadcarsAddCommentRequest = {
    ...request,
    lead_id: leadId,   // ❌ añadía lead_id al body
  };
  return this.executeWithRetry<LeadcarsAddCommentResponse>(
    () => this.post<LeadcarsAddCommentResponse>(url, payload, config),
    'addComment',
  );
}

// DESPUÉS:
async addComment(
  leadId: number,
  request: LeadcarsAddCommentRequest,  // ✅ sin Omit
  config: LeadcarsConfig,
): Promise<Result<LeadcarsAddCommentResponse, DomainError>> {
  const url = `${this.getBaseUrl(config)}/leads/${leadId}/comments`;
  // Enviar directamente sin lead_id en el body
  return this.executeWithRetry<LeadcarsAddCommentResponse>(
    () => this.post<LeadcarsAddCommentResponse>(url, request, config),
    'addComment',
  );
}
```

### `LeadcarsCreateLeadResponse` — campos opcionales

La API real de LeadCars v2.4 no documenta explícitamente el formato de respuesta del `POST /leads`. El código actual asume una estructura específica. Para no romper el adapter si la respuesta cambia, marcar los campos de `data` como opcionales:

```typescript
export interface LeadcarsCreateLeadResponse {
  success: boolean;
  data?: {
    id?: number; // ✅ opcional
    referencia?: string; // ✅ opcional
    nombre?: string; // ✅ opcional
    email?: string; // ✅ opcional
    telefono?: string; // ✅ opcional
    estado?: string; // ✅ opcional
    created_at?: string; // ✅ opcional
    updated_at?: string; // ✅ opcional
  };
  error?: {
    code?: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
```

### Actualizar `syncLead()` en el adapter para tolerar `data` ausente

```typescript
// ANTES (en leadcars-crm-sync.adapter.ts línea 73-94):
const response = result.unwrap();
if (!response.success || !response.data) {
  const errorMsg = response.error?.message || 'Respuesta sin datos';
  return err(
    new LeadSyncFailedError(contactData.visitorId, 'leadcars', errorMsg),
  );
}
this.logger.log(
  `Lead sincronizado exitosamente: ${response.data.id} (ref: ${response.data.referencia})`,
);
return ok({
  externalLeadId: response.data.id.toString(), // ❌ puede fallar si id es undefined
  metadata: {
    referencia: response.data.referencia,
    estado: response.data.estado,
    createdAt: response.data.created_at,
  },
});

// DESPUÉS (tolerante a data parcial):
const response = result.unwrap();
if (!response.success) {
  const errorMsg = response.error?.message || 'LeadCars rechazó el lead';
  this.logger.error(`LeadCars rechazó el lead: ${errorMsg}`);
  return err(
    new LeadSyncFailedError(contactData.visitorId, 'leadcars', errorMsg),
  );
}

const externalId = response.data?.id?.toString() ?? 'unknown';
this.logger.log(
  `Lead sincronizado exitosamente: ${externalId} (ref: ${response.data?.referencia ?? 'N/A'})`,
);

return ok({
  externalLeadId: externalId,
  metadata: {
    ...(response.data?.referencia && { referencia: response.data.referencia }),
    ...(response.data?.estado && { estado: response.data.estado }),
    ...(response.data?.created_at && { createdAt: response.data.created_at }),
  },
});
```

### Callers de `addComment` en el adapter

Buscar usos de `addComment` en el adapter y actualizar la firma del call. Actualmente en `leadcars-crm-sync.adapter.ts` no hay una llamada directa visible a `addComment` (se llama desde el API service), pero si hay un método público en el adapter que lo use, actualizar también.

### Archivos a tocar

| Archivo                                                               | Acción                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `leads/infrastructure/adapters/leadcars/leadcars.types.ts`            | Simplificar `LeadcarsAddCommentRequest`, marcar campos opcionales en responses |
| `leads/infrastructure/adapters/leadcars/leadcars-api.service.ts`      | Actualizar `addComment()` — eliminar spread con `lead_id` en body              |
| `leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts` | Actualizar `syncLead()` para tolerar `data` parcial o ausente                  |

### Dependencias

- Puede implementarse en paralelo con Stories 4.2 y 4.3 (no modifica los mismos tipos)
- Debe completarse antes de Story 4.6 (los tests E2E verificarán estos tipos)

### Referencias

- Tipos actuales: `src/context/leads/infrastructure/adapters/leadcars/leadcars.types.ts` líneas 123-145
- API service actual: `src/context/leads/infrastructure/adapters/leadcars/leadcars-api.service.ts` líneas 69-84
- Adapter `syncLead()`: `src/context/leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts` líneas 73-94
- AGENTS.md discrepancias: `src/context/leads/AGENTS.md` sección "Discrepancias Conocidas"
- Epics story 4.4: `_bmad-output/planning-artifacts/epics.md` líneas 756-783

## Registro del Agente Dev

### Modelo Utilizado

claude-sonnet-4.6 (github-copilot/claude-sonnet-4.6)

### Notas de Completación

### Lista de Ficheros
