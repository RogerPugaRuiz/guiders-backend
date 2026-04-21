# Endpoint Roles Audit

**Version:** 1.0.0  
**Generated:** 21/04/2026  
**Story:** sec-3-1 — Prerrequisito audit de endpoints con roles  
**Status:** APPROVED  
**approvedBy:** Roger Puga  
**approvedDate:** 21/04/2026

---

## Purpose

This document is the authoritative inventory of all HTTP endpoints in `guiders-backend`, their
authentication guards, roles decorators, and security classification. It is the **blocking
prerequisite** for `sec-3.2` (RolesGuard fail-closed implementation).

Once Roger Puga signs off (fills `approvedBy` + `approvedDate`), this document becomes the
contractual source of truth that `sec-3.2` must implement without regressions.

---

## Legend

| Classification | Meaning |
|---|---|
| `PUBLIC_OK` | Intentionally public — no auth required by design |
| `OK` | Properly protected — guard + roles correctly applied |
| `UNPROTECTED` | Missing guard — must be fixed in sec-3.2+ |
| `NEEDS_ROLES` | Has guard but missing `@Roles` / `@RequiredRoles` — fail-open after sec-3.2 |
| `FAIL_OPEN` | Has `@RequiredRoles` but no guard in scope — decorator is silently ignored |
| `CRITICAL` | Guards commented out — completely open |
| `EMPTY` | File has no endpoints — ignore |

---

## Inventory

### 1. `app.controller.ts` — prefix: `/`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| GET | `/` | none | none | `PUBLIC_OK` (health check) |
| GET | `/health` | none | none | `PUBLIC_OK` (health check) |
| GET | `/protected` | `AuthGuard('jwt')` | none | `NEEDS_ROLES` |

---

### 2. `api-key.controller.ts` — prefix: `/api-keys`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| POST | `/create` | none | none | `UNPROTECTED` |
| GET | `/company` | `AuthGuard, RolesGuard` | `admin` | `OK` |

---

### 3. `jwks.controller.ts` — prefix: `/jwks`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| GET | `/.well-known/jwks.json` | none | none | `PUBLIC_OK` (OIDC public key endpoint) |

---

### 4. `auth-user.controller.ts` — prefix: `/user/auth`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| POST | `/login` | none | none | `PUBLIC_OK` (auth flow) |
| POST | `/refresh` | none | none | `PUBLIC_OK` (auth flow) |
| POST | `/logout` | none | none | `PUBLIC_OK` (auth flow) |
| GET | `/validate` | none | none | `PUBLIC_OK` (token validation probe) |
| POST | `/accept-invite` | none | none | `PUBLIC_OK` (invite flow) |
| POST | `/sync-with-keycloak` | none | none | `UNPROTECTED` — fix: `AuthGuard('jwt') + RolesGuard + @RequiredRoles('superadmin')` ⚠️ |
| POST | `/verify-role-mapping` | none | none | `UNPROTECTED` — fix: `AuthGuard('jwt') + RolesGuard + @RequiredRoles('superadmin')` ⚠️ |
| POST | `/register` | `AuthGuard, RolesGuard` | `admin` | `OK` |
| GET | `/company-users` | `AuthGuard, RolesGuard` | `admin` | `OK` |
| GET | `/me` | `DualAuthGuard, RolesGuard` | `admin, commercial` | `OK` |
| GET | `/:keycloakId` | `DualAuthGuard, RolesGuard` | `admin, commercial` | `OK` |
| POST | `/:keycloakId/avatar` | `DualAuthGuard, RolesGuard` | `admin, commercial` | `OK` |
| DELETE | `/:keycloakId/avatar` | `DualAuthGuard, RolesGuard` | `admin, commercial` | `OK` |

---

### 5. `auth-visitor.controller.ts` — prefix: `/pixel`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| ALL | `/*` | none | none | `PUBLIC_OK` (SDK pixel, public by design) |

---

### 6. `bff-auth.controller.ts` — prefix: `/bff/auth`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| ALL | `/*` | none (BFF OIDC flow) | none | `PUBLIC_OK` (BFF handles own cookie/OIDC auth) |

---

### 7. `commercial.controller.ts` — prefix: `/v2/commercials`

> **CRITICAL ⚠️**: All guards and `@Roles` decorators are commented out. Every endpoint is completely open.  
> **Design Decision (21/04/2026, approved by Roger Puga):** Restore commented guards. Intended roles confirmed below.

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| GET | `/` | restore: `AuthGuard, RolesGuard` | `admin, supervisor, commercial` | `CRITICAL` → fix in sec-3.2 |
| GET | `/:id` | restore: `AuthGuard, RolesGuard` | `admin, supervisor, commercial` | `CRITICAL` → fix in sec-3.2 |
| POST | `/` | restore: `AuthGuard, RolesGuard` | `admin, supervisor` | `CRITICAL` → fix in sec-3.2 |
| PUT | `/:id` | restore: `AuthGuard, RolesGuard` | `admin, supervisor` | `CRITICAL` → fix in sec-3.2 |
| DELETE | `/:id` | restore: `AuthGuard, RolesGuard` | `admin, supervisor` | `CRITICAL` → fix in sec-3.2 |
| GET | `/:id/chats` | restore: `AuthGuard, RolesGuard` | `admin, supervisor, commercial` | `CRITICAL` → fix in sec-3.2 |
| GET | `/:id/stats` | restore: `AuthGuard, RolesGuard` | `admin, supervisor, commercial` | `CRITICAL` → fix in sec-3.2 |
| PATCH | `/:id/status` | restore: `AuthGuard, RolesGuard` | `admin, supervisor` | `CRITICAL` → fix in sec-3.2 |

---

### 8. `company.controller.ts` — prefix: `/` (root)

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| POST | `/company` | none | none | `UNPROTECTED` ⚠️ |
| POST | `/sites/resolve` | none | none | `UNPROTECTED` ⚠️ |
| GET | `/company/by-domain/:domain` | none | none | `UNPROTECTED` ⚠️ |
| GET | `/companies/:companyId/sites` | `DualAuthGuard` | none | `NEEDS_ROLES` |
| GET | `/me/company` | `DualAuthGuard` | none | `NEEDS_ROLES` |

---

### 9. `consent.controller.ts` — prefix: `/consents`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| ALL | `/*` | `DualAuthGuard, RolesGuard` (class) | `visitor, commercial, admin` | `OK` |

---

### 10. `assignment-rules.controller.ts` — prefix: `/v2/assignment-rules`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| POST | `/` | `AuthGuard, RolesGuard` (class) | `admin, supervisor` | `OK` |
| PUT | `/:id` | `AuthGuard, RolesGuard` (class) | `admin, supervisor` | `OK` |
| DELETE | `/:id` | `AuthGuard, RolesGuard` (class) | `admin, supervisor` | `OK` |
| GET | `/` | `AuthGuard, RolesGuard` (class) | `admin, supervisor, commercial` | `OK` |
| GET | `/:id` | `AuthGuard, RolesGuard` (class) | `admin, supervisor, commercial` | `OK` |

---

### 11. `chat-v2.controller.ts` — prefix: `/v2/chats`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| POST | `/` | none | `@RequiredRoles` only | `FAIL_OPEN` ⚠️ |
| POST | `/with-message` | `DualAuthGuard, RolesGuard` | `visitor, commercial` | `OK` |
| GET | `/` | `AuthGuard, RolesGuard` | `admin, supervisor, commercial` | `OK` |
| GET | `/response-time-stats` | `AuthGuard, RolesGuard` | `admin, supervisor` | `OK` |
| GET | `/commercial/:id` | `OptionalAuthGuard` | `@RequiredRoles` only | `FAIL_OPEN` ⚠️ |
| GET | `/:chatId` | `DualAuthGuard, RolesGuard` | `admin, supervisor, commercial, visitor` | `OK` |
| GET | `/visitor/:id` | `OptionalAuthGuard` | none | `UNPROTECTED` ⚠️ |
| GET | `/visitor/:id/my-chat` | `DualAuthGuard, RolesGuard` | `visitor` | `OK` |
| GET | `/queue/pending` | none | `@RequiredRoles` only | `FAIL_OPEN` ⚠️ |

---

### 12. `message-v2.controller.ts` — prefix: `/v2/messages`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| POST | `/` | `OptionalAuthGuard` + `@RequiredRoles` | `visitor, commercial` | `FAIL_OPEN` ⚠️ |
| GET | `/chat/:id` | `OptionalAuthGuard` + `@RequiredRoles` | `visitor, commercial, admin` | `FAIL_OPEN` ⚠️ |
| DELETE | `/:id` | `OptionalAuthGuard` + `@RequiredRoles` | `commercial, admin` | `FAIL_OPEN` ⚠️ |
| PUT | `/:id` | `OptionalAuthGuard` + `@RequiredRoles` | `commercial, admin` | `FAIL_OPEN` ⚠️ |
| GET | `/search` | `AuthGuard, RolesGuard` | `admin, supervisor` | `OK` |
| GET | `/chat/:id/stats` | `AuthGuard, RolesGuard` | `admin, supervisor, commercial` | `OK` |
| GET | `/metrics` | `AuthGuard, RolesGuard` | `admin, supervisor` | `OK` |

---

### 13. `presence.controller.ts` — prefix: `/presence`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| ALL | `/*` | `DualAuthGuard, RolesGuard` (class) | `admin, commercial, visitor` | `OK` |

---

### 14. `chat.controller.ts` (V1 legacy)

| Classification |
|---|
| `EMPTY` — file contains no endpoints, ignore |

---

### 15. `leads-admin.controller.ts` — prefix: `/v1/leads/admin`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| ALL | `/*` | `DualAuthGuard, RolesGuard` (class) | `admin` or `admin, commercial` per method | `OK` |

---

### 16. `leads-contact.controller.ts` — prefix: `/leads`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| ALL | `/*` | `DualAuthGuard, RolesGuard` (class) | `admin, commercial` | `OK` |

---

### 17. `llm-config.controller.ts` — prefix: `/v2/llm/config`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| ALL | `/*` | `DualAuthGuard, RolesGuard` (class) | `admin` or `admin, superadmin` per method | `OK` |

---

### 18. `llm-suggestions.controller.ts` — prefix: `/v2/llm`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| ALL | `/*` | `DualAuthGuard, RolesGuard` (class) | `commercial, admin, supervisor` | `OK` |

---

### 19. `tracking-v2.controller.ts` — prefix: `/tracking-v2`

> **Design Decision (21/04/2026, approved by Roger Puga):** SDK-facing endpoints, anonymous traffic by design. Apply `OptionalAuthGuard` at class level — no `RolesGuard`, no `@Roles`. Guard enriches `req.user` if visitor token present; handlers decide what to do with that info.

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| POST | `/events` | `OptionalAuthGuard` (to apply) | none | `PUBLIC_OK` (SDK anonymous by design) |
| POST | `/pageview` | `OptionalAuthGuard` (to apply) | none | `PUBLIC_OK` (SDK anonymous by design) |
| ALL other | `/*` | `OptionalAuthGuard` (to apply) | none | `PUBLIC_OK` (SDK anonymous by design) |

---

### 20. `site-visitors.controller.ts` — prefix: `/site-visitors`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| ALL | `/*` | `DualAuthGuard, RolesGuard` (class) | `commercial, admin` | `OK` |

---

### 21. `sites.controller.ts` (visitors-v2) — prefix: `/sites`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| ALL | `/*` | `DualAuthGuard` (class, no RolesGuard) | none | `NEEDS_ROLES` |

---

### 22. `tenant-visitor-management.controller.ts`

| Classification |
|---|
| `EMPTY` — file contains no endpoints, ignore |

---

### 23. `tenant-visitors.controller.ts` — prefix: `/tenant-visitors`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| ALL | `/*` | `DualAuthGuard, RolesGuard` (class) | `commercial, admin` | `OK` |

---

### 24. `visitor-v2.controller.ts` — prefix: `/visitors`

> **Design Decision (21/04/2026, approved by Roger Puga):** SDK-facing endpoints, anonymous traffic by design. Apply `OptionalAuthGuard` at class level — no `RolesGuard`, no `@Roles`. Guard enriches `req.user` if visitor token present; handlers decide what to do with that info.

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| POST | `/identify` | `OptionalAuthGuard` (to apply) | none | `PUBLIC_OK` (SDK anonymous by design) |
| POST | `/session/end` | `OptionalAuthGuard` (to apply) | none | `PUBLIC_OK` (SDK anonymous by design) |
| PUT | `/status` | `OptionalAuthGuard` (to apply) | none | `PUBLIC_OK` (SDK anonymous by design) |
| GET | `/:id/current-page` | `OptionalAuthGuard` (to apply) | none | `PUBLIC_OK` (SDK anonymous by design) |
| GET | `/:id/activity` | `OptionalAuthGuard` (to apply) | none | `PUBLIC_OK` (SDK anonymous by design) |
| GET | `/:id/site` | `OptionalAuthGuard` (to apply) | none | `PUBLIC_OK` (SDK anonymous by design) |

---

### 25. `visitor.controller.ts` (V1 legacy) — prefix: `/visitor`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| GET | `/me` | `AuthGuard, RolesGuard` | `visitor` | `OK` |
| ALL other | `/*` | needs verification | needs verification | `NEEDS_REVIEW` |

---

### 26. `white-label-config.controller.ts` — prefix: `/v2/companies/:companyId/white-label`

| Method | Path | Guard | Roles | Classification |
|---|---|---|---|---|
| ALL | `/*` | `DualAuthGuard, RolesGuard` (class) | `admin, superadmin` | `OK` |

---

## Summary by Classification

| Classification | Count | Controllers |
|---|---|---|
| `PUBLIC_OK` | ~18 endpoints | `jwks`, `auth-visitor`, `bff-auth`, auth flow endpoints |
| `OK` | ~45 endpoints | `consent`, `assignment-rules`, `presence`, `leads-*`, `llm-*`, `site-visitors`, `tenant-visitors`, `white-label-config`, partial others |
| `CRITICAL` | 8 endpoints | `commercial.controller.ts` (all guards commented out) |
| `UNPROTECTED` | ~14 endpoints | `api-key` (1), `auth-user` (2), `company` (3), `chat-v2` (1), `tracking-v2` (~3+), `visitor-v2` (6+) |
| `FAIL_OPEN` | ~8 endpoints | `chat-v2` (3), `message-v2` (4) — `@RequiredRoles` without `RolesGuard` |
| `NEEDS_ROLES` | ~5 endpoints | `app` (1), `company` (2), `sites` (all), `visitor` V1 |
| `NEEDS_REVIEW` | ~3 endpoints | `visitor.controller.ts` V1 legacy |
| `EMPTY` | 2 files | `chat.controller.ts` V1, `tenant-visitor-management.controller.ts` |

---

## Design Decisions — RESOLVED (21/04/2026)

All design decisions approved by Roger Puga:

1. **`tracking-v2.controller.ts`** → `OptionalAuthGuard` at class level, no `RolesGuard`. SDK anonymous traffic by design.
2. **`visitor-v2.controller.ts`** → `OptionalAuthGuard` at class level, no `RolesGuard`. SDK anonymous traffic by design.
3. **`/sync-with-keycloak` + `/verify-role-mapping`** → `AuthGuard('jwt') + RolesGuard + @RequiredRoles('superadmin')`. Internal ops, restricted access.
4. **`commercial.controller.ts`** → Restore commented guards. Roles: write ops = `admin, supervisor`; read ops = `admin, supervisor, commercial`.

---

## Action Items for sec-3.2

Based on this audit, `sec-3.2` (RolesGuard fail-closed) must:

- [ ] Fix `commercial.controller.ts` — restore commented guards (CRITICAL)
- [ ] Fix `FAIL_OPEN` endpoints in `chat-v2` and `message-v2` — add `RolesGuard` to class or method
- [ ] Fix `NEEDS_ROLES` endpoints — add appropriate `@Roles` decorator
- [ ] Fix `UNPROTECTED` endpoints that are not public by design
- [ ] Make `RolesGuard` fail-closed (deny if no `@Roles` metadata present)
- [ ] Apply design decisions for `tracking-v2`, `visitor-v2`, and internal ops endpoints
- [ ] Add integration tests for each classification change

---

*This document must be reviewed and signed by Roger Puga before sec-3.2 implementation begins.*
