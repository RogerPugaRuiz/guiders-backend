# Story sec-8.1b: Sanitización de PII en logs de seguridad (RolesGuard y guards)

Status: backlog

## Story

Como sistema de observabilidad,
quiero que los logs del `RolesGuard` y demás guards nunca incluyan datos personales del usuario (email, nombre, datos de perfil),
para cumplir GDPR art. 5.1.f y eliminar el riesgo de exfiltración de PII vía logs de infraestructura.

## Contexto

Esta historia nace como deferred item del code review de sec-3.2 (2026-05-07).
El Patch 3 (ya aplicado) elimina `JSON.stringify(user)` en `RolesGuard`, sustituyéndolo por
`{ userId: user.id, roles: user.roles }`. Sin embargo, existe riesgo latente en otros guards y handlers
que aún puedan loguear objetos `user` completos.

Esta historia extiende la cobertura a todos los guards, interceptores y handlers del sistema,
estableciendo una política de logs PII-free verificable con lint y tests.

Referencia: `deferred-work.md` → "Sanitización PII en logs (sec-8.1)".
Epic padre: sec-Epic 8 (Observabilidad, Logs y Gestión de Secretos).
Story relacionada: sec-8.1 (Sanitización completa de logs — secretos, tokens JWT, PII).

## Acceptance Criteria

1. **Ningún guard loguea el objeto `user` completo:**
   - **Given** un request denegado por `RolesGuard`, `AuthGuard`, `IntegrationApiKeyGuard` o cualquier otro guard
   - **When** se revisan los logs generados
   - **Then** ningún log contiene campos `email`, `name`, `password`, `keycloakId` del objeto `user`
   - **And** los logs incluyen solo `{ userId, roles }` o `{ userId, type }` según el contexto

2. **Regla ESLint personalizada (o regex lint check):**
   - **Given** un archivo en `src/context/shared/infrastructure/guards/` que añade `JSON.stringify(user)` en un log
   - **When** se ejecuta `npm run lint`
   - **Then** el lint falla con mensaje `[guiders-security] Prohibited: JSON.stringify(user) in log statement`

3. **Inventario de campos PII en logs:**
   - **Given** el archivo `security-contracts/pii-inventory.yaml` (creado en esta story)
   - **When** se revisa
   - **Then** declara todos los campos PII del objeto `AuthenticatedRequest.user` y los campos que están **permitidos** en logs (`userId`, `roles`, `companyId`) vs **prohibidos** (`email`, `name`, `keycloakId`, `password`)

4. **Tests de regresión PII en guards:**
   - **Given** `RolesGuard` ejecuta `canActivate` con un usuario `{ id, email: 'victim@test.com', roles: ['admin'] }` y acceso denegado
   - **When** se revisa el output del logger mock
   - **Then** ninguna llamada a `logger.error/warn` contiene la string `victim@test.com`

5. **Auditoría de otros guards:**
   - **Given** los archivos `auth.guard.ts`, `integration-api-key.guard.ts`, handlers de eventos WebSocket
   - **When** se revisan en esta story
   - **Then** cualquier log con objeto `user` o payload completo es sustituido por la forma mínima `{ userId, roles }`

## Tasks / Subtasks

- [ ] Auditar todos los guards en `src/context/shared/infrastructure/guards/` y `src/**/guards/`
- [ ] Auditar event handlers en `src/context/conversations-v2/` y `src/context/visitors-v2/` que puedan loguear `request.user`
- [ ] Sustituir cualquier `JSON.stringify(user)` o `logger.*(user)` por forma mínima `{ userId: user.id, roles: user.roles }`
- [ ] Crear `security-contracts/pii-inventory.yaml` con campos permitidos/prohibidos en logs
- [ ] Añadir test de regresión PII en `role.guard.spec.ts` (AC: #4)
- [ ] Explorar viabilidad de regla ESLint custom o script lint (AC: #2) — si inviable, crear issue en sec-11.2
- [ ] Actualizar `deferred-work.md` marcando este item como `in-progress` al comenzar

## Dev Notes

- El Patch 3 de sec-3.2 ya resolvió `role.guard.ts` líneas 103 y 126 — partir de ahí como referencia
- Campos **permitidos** en logs de seguridad: `userId` (UUID), `roles` (array de strings), `companyId`
- Campos **prohibidos** en cualquier log: `email`, `name`, `firstName`, `lastName`, `keycloakId`, `password`, tokens JWT (`eyJ...`)
- Pino logger (usado en el proyecto) soporta `redact` keys — considerar configuración centralizada en `app.module.ts`
- Coordinar con sec-8.1 (story general de sanitización) para no duplicar trabajo — esta story se enfoca en guards/handlers de seguridad; sec-8.1 abarca módulos, app bootstrap y console.log

## Deferred From

Code review de sec-3.2 (2026-05-07).
Ver `deferred-work.md` sección "Deferred from: code review of sec-3-2 (2026-05-07)".
