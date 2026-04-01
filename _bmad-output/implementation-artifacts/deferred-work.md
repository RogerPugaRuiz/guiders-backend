# Deferred Work

## Deferred from: code review of story-4.1 (2026-04-01)

- Sin validación de `concesionarioId` en URL path (`leadcars-api.service.ts:122`): El ID del concesionario se interpola directamente en la URL sin validar que sea un número positivo. Pre-existente: `listSedes` tiene el mismo patrón.
- email y apellidos requeridos por API v2.4 pero no validados/advertidos: La API de LeadCars marca `email` y `apellidos` como requeridos pero el adapter no valida su presencia antes de enviar. Pre-existente: nunca se validó.
