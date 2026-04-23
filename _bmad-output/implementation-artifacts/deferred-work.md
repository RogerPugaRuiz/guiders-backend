# Deferred Work

## Deferred from: code review of story-4.1 (2026-04-01)

- Sin validación de `concesionarioId` en URL path (`leadcars-api.service.ts:122`): El ID del concesionario se interpola directamente en la URL sin validar que sea un número positivo. Pre-existente: `listSedes` tiene el mismo patrón.
- email y apellidos requeridos por API v2.4 pero no validados/advertidos: La API de LeadCars marca `email` y `apellidos` como requeridos pero el adapter no valida su presencia antes de enviar. Pre-existente: nunca se validó.

## Deferred from: code review of story-4.7 (2026-04-02)

- El flujo principal de creación aún no puede enviar `estado` ni `temperature` (`src/context/leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts:266`): Aunque `LeadcarsCreateLeadRequest` ya soporta ambos campos, el camino real `SaveLeadContactData -> syncLead -> buildCreateLeadRequest` no recibe ni mapea esos valores. Razón: Fuera del alcance de la story 4.7; se abordará en una story separada para el flujo de creación end-to-end.

## Deferred from: code review of sec-3-2 (2026-04-22)

- `STRICT_ROLES` leído en cada request en `RolesGuard.canActivate` (`src/context/shared/infrastructure/guards/role.guard.ts`): Acceso a `process.env` por invocación. Impacto mínimo pero podría cachearse en constructor. Se eligió este diseño para compatibilidad con tests que modifican la env var en tiempo de ejecución.
- `@PublicEndpoint()` coexistiendo con `@UseGuards(AuthGuard, RolesGuard)` en `sync-with-keycloak` y `verify-role-mapping` (`src/context/auth/auth-user/infrastructure/controllers/auth-user.controller.ts`): Puede confundir a futuros devs que asuman que el endpoint es público. El decorador está documentado como Swagger-only pero el riesgo de confusión persiste.
