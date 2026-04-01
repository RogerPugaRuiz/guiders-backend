# Historia 4.5: Integración con Módulo Automagic (Journeys)

Status: ready-for-dev

## Historia

Como administrador,
quiero poder asignar leads sincronizados a flujos de nurturing (Automagic) de LeadCars,
para automatizar el seguimiento de leads tras su captura inicial.

> **IMPORTANTE**: Automagic es un módulo opcional. No todos los clientes de LeadCars lo tienen contratado.
> Este módulo usa autenticación diferente al resto de la API: headers `api-user` (email) + `api-token`.

## Criterios de Aceptación

1. **Dado** una empresa con Automagic contratado y configurado (`automagicUser` + `automagicToken` en la config)
   **Cuando** un lead se sincroniza exitosamente con LeadCars
   **Y** la config tiene `defaultJourneyId` definido
   **Entonces** el sistema intenta asignar el lead al flujo configurado
   **Y** el resultado de la asignación se registra en el log (sin bloquear el sync del lead)

2. **Dado** una empresa sin Automagic configurado (sin `automagicUser` o sin `automagicToken`)
   **Cuando** se sincroniza un lead
   **Entonces** la asignación a journeys se omite silenciosamente (no es un error)
   **Y** el sync del lead continúa normalmente

3. **Dado** una llamada a `listJourneys(config)`
   **Cuando** se ejecuta con credenciales Automagic válidas
   **Entonces** retorna `Result<LeadcarsJourney[], DomainError>` con `id` y `title` por cada flujo

4. **Dado** una llamada a `addLeadToJourney(externalLeadId, journeyId, config)`
   **Cuando** el lead ya pasó por el flujo (`409 CONFLICT`)
   **Entonces** se retorna `ok(void)` (no es un error fatal — el lead ya fue procesado)
   **Y** se emite un log de advertencia indicando que el lead ya pasó por el flujo

5. **Dado** una llamada a `addLeadToJourney(externalLeadId, journeyId, config)`
   **Cuando** el lead está actualmente en el flujo (`400 BAD REQUEST`)
   **Entonces** se retorna `ok(void)` (no es un error — el lead ya está en proceso)
   **Y** se emite un log de advertencia

6. **Dado** una llamada a `addLeadToJourney(externalLeadId, journeyId, config)`
   **Cuando** el lead o flujo no existen (`404 NOT FOUND`)
   **Entonces** se retorna `err(CrmApiError)` (sí es un error que debe registrarse)

7. **Dado** una llamada a `getLeadJourneys(externalLeadId, config)`
   **Cuando** se ejecuta con credenciales válidas
   **Entonces** retorna `Result<LeadcarsJourneyLeadStatus[], DomainError>` con el estado del lead en cada flujo

8. **Dado** la config de LeadCars
   **Cuando** se guarda con campos `automagicUser` y `automagicToken`
   **Entonces** estos campos se almacenan y se encriptan igual que `clienteToken` (si Story 2.5 está implementada)

## Tareas / Subtareas

- [ ] Añadir nuevos tipos en `leadcars.types.ts` (AC: 3, 7)
  - [ ] `LeadcarsJourney`: `{ id: string | number; title: string; [key: string]: unknown }`
  - [ ] `LeadcarsJourneyLeadStatus`: `{ journeyId: string | number; status: string; [key: string]: unknown }`
  - [ ] `LeadcarsListJourneysResponse`: `{ data?: LeadcarsJourney[] }` o wrapping similar
  - [ ] `LeadcarsAddLeadToJourneyRequest`: `{ lead_id: string | number; journey_id: string | number }`
  - [ ] `LeadcarsAddLeadToJourneyResponse`: `{ success?: boolean; [key: string]: unknown }`
  - [ ] `LeadcarsGetLeadJourneysResponse`: `{ data?: LeadcarsJourneyLeadStatus[] }`
- [ ] Añadir campos opcionales en `LeadcarsConfig` (AC: 2, 8)
  - [ ] `automagicUser?: string` — email del usuario Automagic
  - [ ] `automagicToken?: string` — token de autenticación Automagic
  - [ ] `defaultJourneyId?: string | number` — ID del flujo para auto-asignación
- [ ] Implementar métodos Automagic en `leadcars-api.service.ts` (AC: 3, 4, 5, 6, 7)
  - [ ] `listJourneys(config: LeadcarsConfig): Promise<Result<LeadcarsListJourneysResponse, DomainError>>`
    - URL: `GET /journeys/list/summary`
    - Headers: `api-user: config.automagicUser` + `api-token: config.automagicToken`
  - [ ] `addLeadToJourney(externalLeadId: string, journeyId: string | number, config: LeadcarsConfig): Promise<Result<void, DomainError>>`
    - URL: `POST /journeys/generate-lead-journey`
    - Body: `{ lead_id: externalLeadId, journey_id: journeyId }`
    - Headers: `api-user` + `api-token`
    - Manejar 409 y 400 como `ok(void)`
  - [ ] `getLeadJourneys(externalLeadId: string, config: LeadcarsConfig): Promise<Result<LeadcarsGetLeadJourneysResponse, DomainError>>`
    - URL: `GET /journeys/list/get-lead-journeys` (verificar si lleva query param)
    - Headers: `api-user` + `api-token`
  - [ ] Método privado `getAutomagicHeaders(config: LeadcarsConfig)`: retorna `{ 'api-user': ..., 'api-token': ... }`
- [ ] Actualizar `leadcars-crm-sync.adapter.ts` — auto-asignación post-sync (AC: 1, 2)
  - [ ] En `syncLead()`, después del sync exitoso:
    - [ ] Comprobar si `config.automagicUser` y `config.automagicToken` y `config.defaultJourneyId` están presentes
    - [ ] Si están: llamar a `this.apiService.addLeadToJourney(externalLeadId, config.defaultJourneyId, leadcarsConfig)`
    - [ ] Loguear resultado (éxito, advertencia 409/400, o error 404)
    - [ ] Si no están: omitir silenciosamente
  - [ ] El resultado de la asignación al journey **NO** debe afectar el retorno de `syncLead()` (el lead ya sincronizó bien)
- [ ] Escribir tests unitarios para los nuevos métodos (AC: 1-7)
  - [ ] Test: `listJourneys` usa headers correctos (`api-user`, `api-token`)
  - [ ] Test: `addLeadToJourney` con 409 retorna `ok(void)`
  - [ ] Test: `addLeadToJourney` con 400 retorna `ok(void)`
  - [ ] Test: `addLeadToJourney` con 404 retorna `err(...)`
  - [ ] Test: `syncLead` con `defaultJourneyId` llama a `addLeadToJourney` tras sync exitoso
  - [ ] Test: `syncLead` sin `automagicUser` no llama a `addLeadToJourney`
- [ ] Ejecutar tests: `npm run test:unit -- src/context/leads`

## Notas de Desarrollo

### Nuevos campos en `LeadcarsConfig`

```typescript
export interface LeadcarsConfig {
  clienteToken: string;
  useSandbox: boolean;
  concesionarioId: number;
  sedeId?: number;
  campanaCode?: string;
  tipoLeadDefault: number;
  defaultCountryCode?: string; // De Story 4.3
  // Automagic (módulo opcional):
  automagicUser?: string; // ✅ Email del usuario Automagic
  automagicToken?: string; // ✅ Token de autenticación Automagic
  defaultJourneyId?: string | number; // ✅ ID del flujo para auto-asignación
}
```

### Nuevos tipos

```typescript
// Flujo de nurturing de Automagic
export interface LeadcarsJourney {
  id: string | number;
  title: string;
  [key: string]: unknown; // Campos adicionales que pueda devolver la API
}

// Estado del lead en un flujo
export interface LeadcarsJourneyLeadStatus {
  journeyId: string | number;
  status: string;
  [key: string]: unknown;
}

// Request para añadir lead a journey
export interface LeadcarsAddLeadToJourneyRequest {
  lead_id: string | number;
  journey_id: string | number;
}

// Responses (opacas — la API no documenta estructura exacta)
export interface LeadcarsListJourneysResponse {
  data?: LeadcarsJourney[];
  [key: string]: unknown;
}

export interface LeadcarsGetLeadJourneysResponse {
  data?: LeadcarsJourneyLeadStatus[];
  [key: string]: unknown;
}
```

### Headers de Automagic vs Headers normales

```typescript
// En LeadcarsApiService:

// Headers normales (todos los endpoints excepto Automagic):
private getHeaders(config: LeadcarsConfig): Record<string, string> {
  return {
    ...LEADCARS_REQUIRED_HEADERS,
    'cliente-token': config.clienteToken,
  };
}

// Headers Automagic (journeys):
private getAutomagicHeaders(config: LeadcarsConfig): Record<string, string> {
  return {
    ...LEADCARS_REQUIRED_HEADERS,
    'api-user': config.automagicUser!,
    'api-token': config.automagicToken!,
  };
}
```

### `addLeadToJourney` — manejo especial de 409 y 400

```typescript
async addLeadToJourney(
  externalLeadId: string,
  journeyId: string | number,
  config: LeadcarsConfig,
): Promise<Result<void, DomainError>> {
  const url = `${this.getBaseUrl(config)}/journeys/generate-lead-journey`;
  const body: LeadcarsAddLeadToJourneyRequest = {
    lead_id: externalLeadId,
    journey_id: journeyId,
  };

  try {
    const axiosConfig: AxiosRequestConfig = {
      headers: this.getAutomagicHeaders(config),
      timeout: 30000,
    };
    await firstValueFrom(
      this.httpService.post(url, body, axiosConfig),
    );
    return ok(undefined);
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      // 409: Ya pasó por el flujo — no es error fatal
      // 400: Está actualmente en el flujo — no es error fatal
      if (status === 409 || status === 400) {
        this.logger.warn(
          `Lead ${externalLeadId} ya en journey ${journeyId}: HTTP ${status}`,
        );
        return ok(undefined);
      }
    }
    return this.handleAxiosError(error, 'POST', url);
  }
}
```

### Auto-asignación en `syncLead()` del adapter

```typescript
// Al final de syncLead(), después de return ok({...}):
// ⚠️ No cambiar el valor de retorno — la asignación es best-effort

// Añadir método privado:
private async tryAssignToDefaultJourney(
  externalLeadId: string,
  config: LeadcarsConfig,
): Promise<void> {
  if (!config.automagicUser || !config.automagicToken || !config.defaultJourneyId) {
    return; // Sin configuración Automagic — silencioso
  }

  this.logger.log(
    `Intentando asignar lead ${externalLeadId} al journey ${config.defaultJourneyId}`,
  );

  const result = await this.apiService.addLeadToJourney(
    externalLeadId,
    config.defaultJourneyId,
    config,
  );

  if (result.isErr()) {
    this.logger.warn(
      `No se pudo asignar lead ${externalLeadId} al journey: ${result.error.message}`,
    );
  } else {
    this.logger.log(
      `Lead ${externalLeadId} asignado al journey ${config.defaultJourneyId}`,
    );
  }
}
```

Y en `syncLead()`, después del `return ok(syncResult)`:

```typescript
// Nota: Este bloque va ANTES del return, pero el resultado no afecta el retorno
const syncResult = {
  externalLeadId: externalId,
  metadata: { ... },
};

// Best-effort: asignar a journey si está configurado (no bloquea ni falla el sync)
void this.tryAssignToDefaultJourney(externalId, leadcarsConfig);

return ok(syncResult);
```

> **Nota sobre floating promise**: El linter puede advertir sobre el `void this.tryAssignToDefaultJourney(...)`. Esto es intencional — la asignación al journey es best-effort y no debe bloquear ni fallar el sync principal. El prefijo `void` es la forma correcta de indicarlo.

### Dependencias

- **Depende de Story 4.1**: `LeadcarsConfig` ya tiene los campos actualizados
- **Puede implementarse en paralelo con 4.2, 4.3, 4.4**: no modifica tipos compartidos
- Story 2.5 (encriptación): Si está implementada, `automagicToken` también debe encriptarse en MongoDB. Sin embargo, esta story no modifica la capa de persistencia — solo añade los campos al tipo `LeadcarsConfig`. La encriptación/desencriptación se maneja en la capa de repositorio (ver Story 2.5).

### Archivos a tocar

| Archivo                                                               | Acción                                                                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `leads/infrastructure/adapters/leadcars/leadcars.types.ts`            | Añadir nuevos tipos Automagic y campos a `LeadcarsConfig`                                   |
| `leads/infrastructure/adapters/leadcars/leadcars-api.service.ts`      | Añadir métodos `listJourneys`, `addLeadToJourney`, `getLeadJourneys`, `getAutomagicHeaders` |
| `leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts` | Añadir `tryAssignToDefaultJourney`, llamar desde `syncLead`                                 |

### Referencias

- Endpoints Automagic: `src/context/leads/AGENTS.md` sección "Módulo Automagic"
- Epics story 4.5: `_bmad-output/planning-artifacts/epics.md` líneas 785-823
- API service actual: `src/context/leads/infrastructure/adapters/leadcars/leadcars-api.service.ts`
- Errores 409/400/404 de Automagic: `src/context/leads/AGENTS.md` sección "Errores Automagic"

## Registro del Agente Dev

### Modelo Utilizado

claude-sonnet-4.6 (github-copilot/claude-sonnet-4.6)

### Notas de Completación

### Lista de Ficheros
