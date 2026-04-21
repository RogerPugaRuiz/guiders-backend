# Story sec-3.1: Prerrequisito — Audit de endpoints con roles y visibilidad esperada

Status: ready-for-dev

## Story

Como equipo de desarrollo,
quiero tener un inventario firmado de todos los endpoints con su autenticación y rol requerido,
para poder activar RolesGuard fail-closed en sec-3.2 sin romper el sistema.

## Acceptance Criteria

1. **Generación del inventario:**
   - El archivo `security-contracts/endpoint-roles-audit.md` existe en el repositorio
   - Lista CADA endpoint (método HTTP + path completo) de todos los controllers
   - Para cada endpoint indica: guard actual, rol requerido actual (`@Public`, `@Roles(['admin'])`, etc.), decorador de tenant context esperado
   - Identifica endpoints sin guard (`UNPROTECTED`) como hallazgos a corregir en sec-3.2

2. **Aprobación:**
   - Roger Puga revisa y firma el archivo añadiendo en el frontmatter: `approvedBy: Roger Puga` y `approvedDate: YYYY-MM-DD`

3. **Análisis de gap:**
   - El documento incluye una sección "Hallazgos" listando los endpoints que quedarán bloqueados al activar fail-closed
   - Para cada endpoint sin `@Roles()` se propone la corrección: añadir `@Roles([...])` o `@Public()`

## Tasks / Subtasks

- [ ] Escanear todos los controllers y construir el inventario (AC: #1)
  - [ ] `src/app.controller.ts`
  - [ ] `src/context/auth/api-key/infrastructure/api-key.controller.ts`
  - [ ] `src/context/auth/api-key/infrastructure/jwks.controller.ts`
  - [ ] `src/context/auth/auth-user/infrastructure/controllers/auth-user.controller.ts`
  - [ ] `src/context/auth/auth-visitor/infrastructure/auth-visitor.controller.ts`
  - [ ] `src/context/auth/bff/infrastructure/controllers/bff-auth.controller.ts`
  - [ ] `src/context/commercial/infrastructure/controllers/commercial.controller.ts`
  - [ ] `src/context/company/infrastructure/controllers/company.controller.ts`
  - [ ] `src/context/consent/infrastructure/controllers/consent.controller.ts`
  - [ ] `src/context/conversations-v2/infrastructure/controllers/assignment-rules.controller.ts`
  - [ ] `src/context/conversations-v2/infrastructure/controllers/chat-v2.controller.ts`
  - [ ] `src/context/conversations-v2/infrastructure/controllers/message-v2.controller.ts`
  - [ ] `src/context/conversations-v2/infrastructure/controllers/presence.controller.ts`
  - [ ] `src/context/conversations/chat/infrastructure/chat.controller.ts`
  - [ ] `src/context/leads/infrastructure/controllers/leads-admin.controller.ts`
  - [ ] `src/context/leads/infrastructure/controllers/leads-contact.controller.ts`
  - [ ] `src/context/llm/infrastructure/controllers/llm-config.controller.ts`
  - [ ] `src/context/llm/infrastructure/controllers/llm-suggestions.controller.ts`
  - [ ] `src/context/tracking-v2/infrastructure/controllers/tracking-v2.controller.ts`
  - [ ] `src/context/visitors-v2/infrastructure/controllers/site-visitors.controller.ts`
  - [ ] `src/context/visitors-v2/infrastructure/controllers/sites.controller.ts`
  - [ ] `src/context/visitors-v2/infrastructure/controllers/tenant-visitor-management.controller.ts`
  - [ ] `src/context/visitors-v2/infrastructure/controllers/tenant-visitors.controller.ts`
  - [ ] `src/context/visitors-v2/infrastructure/controllers/visitor-v2.controller.ts`
  - [ ] `src/context/visitors/infrastructure/controllers/visitor.controller.ts`
  - [ ] `src/context/white-label/infrastructure/controllers/white-label-config.controller.ts`
  - [ ] EXCLUIR: `src/context/shared/infrastructure/open-search/tests/open-search.controller.ts` (test only)

- [ ] Crear `security-contracts/endpoint-roles-audit.md` con la estructura definida (AC: #1)

- [ ] Identificar y listar todos los endpoints UNPROTECTED en la sección "Hallazgos" (AC: #3)
  - [ ] Endpoints con `@UseGuards` pero sin `@Roles()` → bloqueados por fail-closed
  - [ ] Endpoints sin ningún `@UseGuards` → completamente desprotegidos

- [ ] Entregar el documento a Roger para revisión y firma (AC: #2)

## Dev Notes

### Contexto y propósito

Esta story es un **prerrequisito bloqueante** para sec-3.2 (RolesGuard fail-closed). Sin este inventario firmado, no es seguro activar fail-closed porque podría romper endpoints legítimos en producción.

El RolesGuard actual en `role.guard.ts:42-48` hace **fail-open**: si no hay roles definidos, permite el acceso. La story sec-3.2 invierte esto. Este audit identifica todos los endpoints que cambiarían de comportamiento.

### Estado actual del RolesGuard

```typescript
// src/context/shared/infrastructure/guards/role.guard.ts:42-48
if (!requiredRoles || requiredRoles.length === 0) {
  // Si no se especifica ningún rol, se permite el acceso  ← FAIL-OPEN (problema)
  return true;
}
```

### Hallazgos conocidos a documentar

Del análisis del código fuente:

| Controller | Situación |
|---|---|
| `commercial.controller.ts` | Guards comentados (`// @UseGuards(WsAuthGuard, WsRolesGuard)`), roles también comentados. **COMPLETAMENTE DESPROTEGIDO** |
| `app.controller.ts` | `GET /` y `GET /websocket-test` sin guard. `GET /protected` usa `@UseGuards(AuthGuard('jwt'))` sin `@Roles()` |
| `company.controller.ts` | `POST /company`, `POST /sites/resolve`, `GET /company/by-domain/:domain` sin guard. `GET /companies/:companyId/sites` y `GET /me/company` con `DualAuthGuard` pero sin `@Roles()` |
| `visitor-v2.controller.ts` | `POST /identify`, `POST /session/end`, `PUT /status` sin guard (endpoints de visitante, posiblemente intencional — verificar) |
| `sites.controller.ts` | `@UseGuards(DualAuthGuard)` en clase pero sin `@Roles()` — fail-closed bloqueará todos sus endpoints |
| `auth-visitor.controller.ts` | `POST /token`, `POST /register`, `POST /token/refresh`, `GET /metadata` sin guard (públicos por diseño) |
| `jwks.controller.ts` | `GET /jwks` sin guard (público por diseño) |

### Estructura del archivo a generar

```markdown
---
generatedDate: YYYY-MM-DD
approvedBy: [PENDIENTE]
approvedDate: [PENDIENTE]
---

# Endpoint Roles Audit — guiders-backend

## Inventario de Endpoints

| Controller | Método | Path | Guard Actual | Roles Actuales | Tenant Context Esperado | Estado |
|---|---|---|---|---|---|---|
| AppController | GET | / | ninguno | ninguno | @NoTenantContext | UNPROTECTED |
...

## Hallazgos — Endpoints afectados por fail-closed

### Endpoints que quedarán bloqueados (tienen guard pero sin @Roles)
...

### Endpoints completamente desprotegidos (sin guard)
...

## Propuestas de corrección
...
```

### Columnas del inventario

- **Controller**: nombre de la clase
- **Método**: GET, POST, PUT, PATCH, DELETE
- **Path**: path completo incluyendo el prefijo del controller
- **Guard Actual**: `ninguno`, `AuthGuard`, `DualAuthGuard`, `OptionalAuthGuard`, etc.
- **Roles Actuales**: `ninguno`, `['admin']`, `['commercial', 'admin']`, `@Public`, etc.
- **Tenant Context Esperado**: `@RequireTenantContext`, `@OptionalTenantContext`, `@NoTenantContext`
- **Estado**: `OK` (tiene guard + roles), `NEEDS_ROLES` (tiene guard sin roles), `UNPROTECTED` (sin guard), `PUBLIC_OK` (público por diseño)

### Guards existentes en el proyecto

```
src/context/shared/infrastructure/guards/
├── auth.guard.ts          — AuthGuard: JWT obligatorio (usuarios Keycloak)
├── dual-auth.guard.ts     — DualAuthGuard: JWT usuario O API key
├── jwt-cookie-auth.guard.ts — JWT desde cookie HttpOnly
├── optional-auth.guard.ts — OptionalAuthGuard: auth opcional (sin reject si no hay token)
└── role.guard.ts          — RolesGuard: verificación de roles (actualmente fail-open)
```

### Prefijos de los controllers (para construir paths completos)

Verificar en cada `@Controller('prefix')` decorador. Algunos conocidos:
- `app.controller.ts` → sin prefijo (raíz)
- `jwks.controller.ts` → `/.well-known/jwks.json` (verificar)
- `auth-user.controller.ts` → `/auth` o similar
- `leads-admin.controller.ts` → `/v1/leads/admin`
- `leads-contact.controller.ts` → `/leads/contact-data`
- `tenant-visitors.controller.ts` → verificar
- `tracking-v2.controller.ts` → `/tracking` o similar

### Archivo de salida

**Ruta:** `security-contracts/endpoint-roles-audit.md`

El directorio `security-contracts/` debe crearse en la raíz del repositorio si no existe.

### Project Structure Notes

- Este story NO modifica código de producción — solo genera documentación de auditoría
- El archivo resultante es un artefacto de seguridad que será referenciado por sec-3.2, sec-3.3 y sec-3.4
- El archivo `security-contracts/endpoint-protections.yaml` (referenciado en sec-3.6) es un artefacto diferente que se crea en stories posteriores

### References

- Guard actual: `src/context/shared/infrastructure/guards/role.guard.ts:42-48` — lógica fail-open actual
- Epic de seguridad: `_bmad-output/planning-artifacts/security-epics.md` — Story sec-3.1, líneas 521-542
- Security PRD: `_bmad-output/planning-artifacts/security-prd.md` — FR-AUTHZ-001 (prerrequisito)
- Hallazgos V2: CRIT-008 (RolesGuard fail-open), AUTH-019 (endpoints sin decorador)

## Dev Agent Record

### Agent Model Used

_a rellenar por el agente_

### Debug Log References

### Completion Notes List

### File List

- `security-contracts/endpoint-roles-audit.md` (nuevo — artefacto principal de esta story)
