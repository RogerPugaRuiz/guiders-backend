# Deferred Work

## Deferred from: code review of story-4.1 (2026-04-01)

- Sin validación de `concesionarioId` en URL path (`leadcars-api.service.ts:122`): El ID del concesionario se interpola directamente en la URL sin validar que sea un número positivo. Pre-existente: `listSedes` tiene el mismo patrón.
- email y apellidos requeridos por API v2.4 pero no validados/advertidos: La API de LeadCars marca `email` y `apellidos` como requeridos pero el adapter no valida su presencia antes de enviar. Pre-existente: nunca se validó.

## Deferred from: code review of story-4.7 (2026-04-02)

- El flujo principal de creación aún no puede enviar `estado` ni `temperature` (`src/context/leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts:266`): Aunque `LeadcarsCreateLeadRequest` ya soporta ambos campos, el camino real `SaveLeadContactData -> syncLead -> buildCreateLeadRequest` no recibe ni mapea esos valores. Razón: Fuera del alcance de la story 4.7; se abordará en una story separada para el flujo de creación end-to-end.

## Deferred from: sdk-missing-endpoints spec (2026-05-05)

- `POST /api/consents/grant` — El `RecordConsentCommand` ya existe en aplicación pero no se expone como endpoint HTTP. Diferido porque el flujo `identify → renew` cubre todos los casos actuales. Implementar solo si el producto necesita granularidad post-identificación (ej. banner de cookies por categoría con consentimiento explícito por tipo). El SDK puede reactivar el método `grantConsents()` que fue eliminado en v1.6.0 cuando este endpoint esté disponible.

## Deferred from: code review of sec-3-2 (2026-05-07)

- `OptionalAuthGuard` + `RolesGuard` con `@Roles(['visitor'])` rompe visitantes anónimos en message-v2: diseño pendiente de decisión — si el rol `visitor` requiere sesión activa o se debe permitir acceso anónimo real.
- `OptionalAuthGuard` no respeta `@Public()`: procesa auth probes innecesariamente en endpoints públicos. Pre-existente, impacto menor de rendimiento.
- Roles de visitante en `OptionalAuthGuard` sin binding criptográfico: a evaluar en sec-Epic 6 (Multi-Tenant Data Isolation).
- `extractToken` descarta tokens con espacios: pre-existente, no aplica a JWT estándar.
- `STRICT_ROLES` mutable en runtime: diseño deliberado para compatibilidad con tests; en producción no es un riesgo real.
