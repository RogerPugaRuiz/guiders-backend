---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/security-prd.md
  - _bmad-output/planning-artifacts/security-architecture.md
  - project-context.md
  - AGENTS.md
workflowType: 'epics-and-stories'
project_name: 'guiders-backend — Security Hardening'
user_name: 'Roger Puga'
date: '2026-04-21'
scope: 'P0 (Sprint 1) + P1 (Sprint 2) — 40 hallazgos CRÍTICOS + 60 ALTOS'
---

# guiders-backend — Security Hardening — Epic Breakdown

## Overview

Este documento descompone los 68 FRs del security PRD en epics y stories ejecutables, organizados por sprint y por capacidad de seguridad. Cada story traza a ≥1 FR y ≥1 hallazgo del informe V2. El objetivo verificable es: **0 hallazgos CRÍTICOS y 0 ALTOS en la re-auditoría V3**.

---

## Requirements Inventory

### Functional Requirements

**FR-AUTH:** FR-AUTH-001…FR-AUTH-013 (JWT, algoritmos, kid, iss/aud, backoff, blacklist, API keys, cifrado, rotación)
**FR-AUTHZ:** FR-AUTHZ-001…FR-AUTHZ-006 (RolesGuard fail-closed, decoradores tenant context, guard order)
**FR-API:** FR-API-001…FR-API-009 (endpoint-protections YAML, validation pipe, CORS, rate limiter Redis)
**FR-INJ:** FR-INJ-001…FR-INJ-005 (CriteriaConverter whitelist, SSRF, prototype pollution, Mongoose projection, file upload)
**FR-DATA:** FR-DATA-001…FR-DATA-006 (companyId schemas, BaseTenantAwareRepository, backfill, bulk ops, cifrado en reposo)
**FR-WS:** FR-WS-001…FR-WS-005 (Redis adapter, handshake JWT-only, tenant guard, room-name helper, throttle)
**FR-OBS:** FR-OBS-001…FR-OBS-006 (logger sanitizer, no console.log, gitleaks, rotación credenciales, JWT_SECRET sin fallback, audit trail)
**FR-INFRA:** FR-INFRA-001…FR-INFRA-007 (Dockerfile LTS non-root, GH Actions OIDC, Keycloak prod, MongoDB TLS, docker-compose, npm audit)
**FR-GDPR:** FR-GDPR-001…FR-GDPR-005 (audit log PII, consent revoke, erasure, portabilidad, PII en logs prohibida)
**FR-CI:** FR-CI-001…FR-CI-009 (endpoint-protections.spec, ESLint plugin, skip en isolation tests, coverage gate, mutation testing, TimeProvider, time-travel tests, WS events spec, finding-to-fr mapping)
**FR-RISK:** FR-RISK-001…FR-RISK-004 (risk acceptance template, reviewer distinto, límite 3 activos, GH Action scheduled)

### NonFunctional Requirements

- **NFR-SEC-001:** Re-auditoría V3 reporta 0 CRITICAL y 0 HIGH
- **NFR-SEC-002:** 0 endpoints autenticados sin decorador de tenant context
- **NFR-SEC-003:** 0 schemas Mongo multi-tenant sin companyId indexado
- **NFR-SEC-004:** 0 secretos detectados en repo (gitleaks/trufflehog)
- **NFR-SEC-005:** 0 dependencias CVE HIGH/CRITICAL sin patch o risk acceptance
- **NFR-PERF-001:** Overhead de guards + audit async ≤15% en P95 HTTP endpoints
- **NFR-PERF-002:** AES-GCM dual-read ≤+50ms P95 en `/auth/api-key/verify`
- **NFR-PERF-003:** WS handshake con JWT <100ms P95
- **NFR-PERF-004:** Audit log write asíncrono fire-and-forget con buffer
- **NFR-AVAIL-001:** Redis caído → degradación documentada, no crash global
- **NFR-AVAIL-002:** Mongo failover sin downtime >30s
- **NFR-AVAIL-003:** Rotación de credenciales zero-downtime
- **NFR-OBS-001:** 100% eventos de seguridad en audit log con latencia P99 <5s
- **NFR-OBS-002:** Métricas Prometheus: auth_failure, tenant_isolation_violation, rate_limit_blocked, audit_write_failure
- **NFR-OBS-003:** Alertas Grafana para spikes de auth_failure, cualquier tenant_isolation_violation, audit_write_failure
- **NFR-COMP-001:** Right-to-erasure completo en <7 días
- **NFR-COMP-002:** Audit log PII inmutable 2 años
- **NFR-COMP-003:** PII inventory YAML con lint check para campos nuevos
- **NFR-COMP-004:** Export datos personales en <24h

### Additional Requirements (Architecture)

- Sistema brownfield en producción — zero regression en contratos API públicos
- Redis requerido como store compartido para WS adapter + rate limiter (DA-SEC-05, DA-SEC-06)
- `security-contracts/endpoint-protections.yaml` como fuente de verdad machine-readable para CI y audit
- `security-contracts/finding-to-fr-mapping.yaml` para trazabilidad V2→FR (FR-CI-009)
- `security-contracts/pii-inventory.yaml` para inventario de campos PII (NFR-COMP-003)
- Prerrequisito bloqueante antes de Sprint 1: `security-contracts/endpoint-roles-audit.md` firmado
- Runbooks obligatorios: `docs/runbooks/aes-gcm-migration.md`, `jwt-key-rotation.md`, `secret-rotation.md`, `redis-failover.md`
- Ventana dual-read AES-CBC/AES-GCM de 30 días con feature flag `AES_CBC_LEGACY_READS`
- Risk acceptance formal para Redis SPOF: `security-contracts/risk-accepted/redis-spof.md`

### UX Design Requirements

_No aplica — proyecto backend sin UI propia. Los cambios de contrato API que afectan al dashboard comercial o al plugin WP se documentan en las stories correspondientes con notas de compatibilidad._

---

### FR Coverage Map

| FR | Epic que lo cubre |
|---|---|
| FR-AUTH-001…FR-AUTH-004 | Epic 1 — JWT Hardening |
| FR-AUTH-005 | Epic 4 — Rate Limiting y Backoff |
| FR-AUTH-006 | Epic 1 — JWT Hardening |
| FR-AUTH-007, FR-AUTH-008, FR-AUTH-009, FR-AUTH-010 | Epic 2 — Cifrado y API Keys |
| FR-AUTH-011, FR-AUTH-012, FR-AUTH-013 | Epic 1 — JWT Hardening |
| FR-AUTHZ-001…FR-AUTHZ-006 | Epic 3 — Guard Pipeline y Tenant Context |
| FR-API-001…FR-API-009 | Epic 3 — Guard Pipeline y Tenant Context / Epic 4 |
| FR-INJ-001…FR-INJ-005 | Epic 5 — Injection Prevention |
| FR-DATA-001…FR-DATA-006 | Epic 6 — Multi-Tenant Isolation |
| FR-WS-001…FR-WS-005 | Epic 7 — WebSocket Hardening |
| FR-OBS-001…FR-OBS-006 | Epic 8 — Observabilidad y Secrets |
| FR-INFRA-001…FR-INFRA-007 | Epic 9 — Infraestructura y Supply Chain |
| FR-GDPR-001…FR-GDPR-005 | Epic 10 — GDPR y Compliance |
| FR-CI-001…FR-CI-009 | Epic 11 — DevSecOps Pipeline y Enforcement CI |
| FR-RISK-001…FR-RISK-004 | Epic 11 — DevSecOps Pipeline y Enforcement CI |

---

## Epic List

### Epic 1: JWT Hardening y Gestión de Tokens
Cierra las vulnerabilidades críticas del stack de autenticación JWT: bug de `kid`, algoritmos sin whitelist, validación de `iss`/`aud`, blacklist de tokens revocados y rotación de claves de firma.
**Sprint:** 1 (committed) | **FRs cubiertos:** FR-AUTH-001, FR-AUTH-002, FR-AUTH-003, FR-AUTH-004, FR-AUTH-006, FR-AUTH-011, FR-AUTH-012, FR-AUTH-013

### Epic 2: Cifrado Moderno y API Keys Seguras
Migra el cifrado en reposo de AES-256-CBC (sin MAC) a AES-256-GCM (AEAD) y elimina las API keys predecibles basadas en hash del dominio.
**Sprint:** 1 (parcial P0 flag) + 2 (migración completa) | **FRs cubiertos:** FR-AUTH-007, FR-AUTH-008, FR-AUTH-009, FR-AUTH-010, FR-DATA-006

### Epic 3: Guard Pipeline Fail-Closed y Contexto Tenant
Invierte el default del RolesGuard a fail-closed y establece los tres decoradores de tenant context obligatorios en todos los controllers.
**Sprint:** 1 (committed) | **FRs cubiertos:** FR-AUTHZ-001…FR-AUTHZ-006, FR-API-001, FR-API-002, FR-API-004, FR-API-005, FR-API-007, FR-API-008, FR-API-009

### Epic 4: Rate Limiting con Redis y Backoff Progresivo
Migra el rate limiter de in-memory a Redis compartido e implementa backoff exponencial en endpoints de autenticación.
**Sprint:** 2 | **FRs cubiertos:** FR-AUTH-005, FR-API-003

### Epic 5: Injection Prevention
Cierra los vectores de inyección: SQL en CriteriaConverter, SSRF en endpoints con URLs externas, prototype pollution en body parser.
**Sprint:** 1 (stretch) + 2 | **FRs cubiertos:** FR-INJ-001…FR-INJ-005

### Epic 6: Multi-Tenant Data Isolation
Implementa las tres capas defensivas de aislamiento: companyId obligatorio en schemas Mongo, BaseTenantAwareRepository, e isolation tests por aggregate.
**Sprint:** 1 (committed schemas) + 2 (capas 2 y 3 completas) | **FRs cubiertos:** FR-DATA-001…FR-DATA-006

### Epic 7: WebSocket Hardening
Protege el gateway Socket.IO con Redis adapter, handshake JWT-only, validación de tenant por evento y room-name helper.
**Sprint:** 2 | **FRs cubiertos:** FR-WS-001…FR-WS-005

### Epic 8: Observabilidad, Logs y Gestión de Secretos
Sanitiza los logs de secretos, implanta el audit trail inmutable y establece el procedimiento de rotación de credenciales.
**Sprint:** 1 (logger sanitizer + gitleaks) + 2 (audit trail) | **FRs cubiertos:** FR-OBS-001…FR-OBS-006

### Epic 9: Infraestructura y Supply Chain
Hardening de Dockerfile, GH Actions, Keycloak en modo producción y MongoDB con mínimo privilegio.
**Sprint:** 2 | **FRs cubiertos:** FR-INFRA-001…FR-INFRA-007

### Epic 10: GDPR y Compliance
Implementa el derecho al olvido, audit log de accesos a PII, portabilidad de datos y legal basis en consentimientos.
**Sprint:** 2 | **FRs cubiertos:** FR-GDPR-001…FR-GDPR-005, NFR-COMP-001…NFR-COMP-004

### Epic 11: DevSecOps Pipeline y Enforcement CI
Construye el ESLint plugin custom de seguridad, los tests de endpoint-protections y WS-events YAML-driven, y la infraestructura de risk acceptance.
**Sprint:** 2 | **FRs cubiertos:** FR-CI-001…FR-CI-009, FR-RISK-001…FR-RISK-004

---

## Epic 1: JWT Hardening y Gestión de Tokens

**Objetivo:** Cerrar las vulnerabilidades críticas del stack JWT: fix del bug de `kid`, whitelist de algoritmos, validación de `iss`/`aud`, eliminación del fallback hardcodeado de `JWT_SECRET`, blacklist de tokens revocados y soporte de rotación de claves de firma.

---

### Story 1.1: Fix bug `kid` — leer del header JWT, no del payload

Como sistema de autenticación,
quiero verificar el `kid` siempre desde el header del JWT,
para que un atacante no pueda manipular la selección de clave pública embebiendo `kid` en el payload.

**Hallazgos V2:** CRIT-003, AUTH-015 | **FR:** FR-AUTH-002

**Acceptance Criteria:**

**Given** un JWT con `kid` en `payload.kid` pero sin `kid` en `header`
**When** el sistema intenta verificar el token
**Then** el sistema rechaza el token con 401 y loguea "Token sin kid en header"

**Given** un JWT con `kid` en el `header` correctamente
**When** el sistema verifica el token
**Then** el sistema resuelve la clave pública usando `header.kid` y la verificación continúa normalmente

**Given** el código de `token-verify.service.ts`
**When** se ejecuta análisis estático sobre todos los usos de `jwt.verify` y `decode`
**Then** ninguna línea lee `payload.kid` o `decodedToken.payload?.kid`

---

### Story 1.2: Whitelist explícita de algoritmos en todos los puntos de verificación JWT

Como sistema de autenticación,
quiero que todos los `jwt.verify` tengan whitelist explícita de algoritmos,
para que tokens con `alg: none` o algorithm confusion (HS256 con clave pública) sean rechazados automáticamente.

**Hallazgos V2:** CRIT-004, AUTH-007, AUTH-012 | **FR:** FR-AUTH-001

**Acceptance Criteria:**

**Given** un JWT firmado con `alg: none`
**When** el sistema intenta verificarlo
**Then** el token es rechazado con 401 sin ejecutar ninguna lógica de negocio

**Given** un JWT de usuario (Keycloak) con `alg: HS256` en lugar de `RS256`
**When** el sistema intenta verificarlo
**Then** el token es rechazado con 401 — algorithm confusion detectado

**Given** un JWT de visitante (backend-issued) con `alg: RS256` en lugar de `HS256`
**When** el sistema intenta verificarlo
**Then** el token es rechazado con 401

**Given** el código fuente
**When** análisis estático busca `jwt.verify(` sin el campo `algorithms`
**Then** el resultado es cero ocurrencias en archivos de producción (excluidos test fixtures)

---

### Story 1.3: Validación de `iss` y `aud` en JWT de usuarios y visitantes

Como sistema de autenticación,
quiero validar `iss` y `aud` en todos los JWT contra whitelists por tipo de token,
para que tokens emitidos por terceros o para audiencias incorrectas sean rechazados.

**Hallazgos V2:** AUTH-018, AUTH-019 | **FR:** FR-AUTH-003

**Acceptance Criteria:**

**Given** un JWT de usuario con `iss` que no coincide con `KEYCLOAK_ISSUER`
**When** el sistema intenta verificarlo
**Then** el token es rechazado con 401

**Given** un JWT de visitante con `aud` que no es `'visitor'`
**When** el sistema intenta verificarlo
**Then** el token es rechazado con 401

**Given** un JWT de usuario sin campo `aud`
**When** el sistema intenta verificarlo
**Then** el token es rechazado con 401

**Given** variables de entorno `KEYCLOAK_ISSUER` y `KEYCLOAK_CLIENT_ID` no configuradas
**When** el proceso arranca
**Then** el arranque falla con error explícito `JWT_CONFIG: KEYCLOAK_ISSUER is required`

---

### Story 1.4: Validar `exp` y `nbf` con clock skew máximo 30 segundos

Como sistema de autenticación,
quiero que la validación de expiración y not-before sea estricta con margen de 30 segundos,
para eliminar ventanas de ataque por tokens expirados o prematuros.

**Hallazgos V2:** AUTH-021 | **FR:** FR-AUTH-004

**Acceptance Criteria:**

**Given** un JWT con `exp` 31 segundos en el pasado
**When** el sistema intenta verificarlo
**Then** el token es rechazado con 401 y mensaje "Token expirado"

**Given** un JWT con `exp` 29 segundos en el pasado (dentro del clock skew permitido)
**When** el sistema intenta verificarlo
**Then** el token es aceptado — dentro de la ventana de gracia

**Given** un JWT con `nbf` 31 segundos en el futuro
**When** el sistema intenta verificarlo
**Then** el token es rechazado con 401 y mensaje "Token no válido aún"

---

### Story 1.5: Eliminar fallback hardcodeado de `JWT_SECRET` en main.ts

Como sistema,
quiero que el arranque falle explícitamente si `JWT_SECRET` no está en el entorno,
para que nunca se use un secreto hardcodeado por omisión de configuración.

**Hallazgos V2:** INFRA-001 (implícito) | **FR:** FR-OBS-005

**Acceptance Criteria:**

**Given** el proceso arranca sin la variable de entorno `JWT_SECRET`
**When** NestJS inicializa el módulo de autenticación
**Then** el proceso termina con código de salida no-cero y mensaje `JWT_SECRET env var is required`

**Given** el código de `main.ts`
**When** se busca `?? '` o `|| '` en contextos de JWT_SECRET
**Then** no se encuentra ninguna ocurrencia — sin fallback hardcodeado

**Given** el proceso arranca con `JWT_SECRET` presente en el entorno
**When** NestJS inicializa
**Then** el arranque completa normalmente

---

### Story 1.6: Blacklist de JWT revocados (logout y revoke-all-sessions)

Como usuario autenticado,
quiero que al hacer logout mi token sea inmediatamente invalidado,
para que aunque el token no haya expirado nadie pueda usarlo tras el logout.

**Hallazgos V2:** AUTH-008, AUTH-011 | **FR:** FR-AUTH-006

**Acceptance Criteria:**

**Given** un usuario autenticado que ejecuta logout
**When** el backend procesa el logout
**Then** el `jti` del token es almacenado en la colección `jwt_revocations` con TTL igual a la expiración del token
**And** la respuesta del logout retorna 200

**Given** un token cuyo `jti` está en `jwt_revocations`
**When** se usa ese token en cualquier endpoint autenticado
**Then** el sistema retorna 401 — token revocado

**Given** el `AuthGuard`
**When** verifica un token válido (firma correcta, no expirado)
**Then** consulta Redis (cache 60s) y si no está en cache consulta `jwt_revocations` en Mongo antes de permitir acceso

**Given** el TTL del token en la blacklist ha expirado naturalmente
**When** MongoDB aplica el TTL index
**Then** el documento se elimina automáticamente de la colección

---

### Story 1.7: JWKS endpoint con claves públicas versionadas y soporte de rotación

Como sistema de verificación de tokens,
quiero que el JWKS endpoint sirva claves con `kid` versionado y soporte graceful rotation,
para que la rotación de claves no cause downtime ni tokens inválidos en tráfico.

**Hallazgos V2:** AUTH-013 | **FR:** FR-AUTH-011, FR-AUTH-013

**Acceptance Criteria:**

**Given** una petición `GET /jwks` sin autenticación
**When** el sistema responde
**Then** retorna JSON con array de claves públicas, cada una con `kid`, `alg`, `kty`, `use: sig`
**And** el header `Cache-Control: max-age=3600` está presente

**Given** se inicia una rotación de clave (nueva clave generada con nuevo `kid`)
**When** el sistema sirve el JWKS
**Then** tanto la clave nueva como la anterior (durante ventana de gracia) están en el array JWKS

**Given** un token firmado con la clave anterior durante la ventana de gracia
**When** el sistema intenta verificarlo
**Then** el sistema acepta el token usando la clave correcta identificada por `header.kid`

**Given** el runbook `docs/runbooks/jwt-key-rotation.md`
**When** el equipo lo revisa
**Then** describe el procedimiento completo de rotación con pasos de rollback

---

### Story 1.8: Validación de `state` y PKCE en flujo OAuth BFF

Como sistema BFF,
quiero que el callback OAuth valide `state` contra la sesión activa y `code_verifier` PKCE,
para prevenir ataques CSRF en el flujo de autorización.

**Hallazgos V2:** AUTH-016, AUTH-017 | **FR:** FR-AUTH-012

**Acceptance Criteria:**

**Given** un callback OAuth con `state` que no coincide con el almacenado en sesión
**When** el BFF procesa el callback
**Then** el sistema retorna 400 y descarta el flujo

**Given** un callback OAuth con `state` que ya fue usado previamente (replay)
**When** el BFF procesa el callback
**Then** el sistema retorna 400 — state reutilizado

**Given** un callback OAuth legítimo con `state` válido y `code_verifier` correcto
**When** el BFF procesa el callback
**Then** el intercambio de código continúa normalmente y se emite la cookie HttpOnly

---

## Epic 2: Cifrado Moderno y API Keys Seguras

**Objetivo:** Migrar el cifrado en reposo de AES-256-CBC (sin MAC, vulnerable a padding oracle) a AES-256-GCM (AEAD), y reemplazar las API keys predecibles (`SHA256(domain)`) por 256 bits criptográficamente aleatorios.

---

### Story 2.1: Deprecación de AES-256-CBC con warning + feature flag

Como equipo de desarrollo,
quiero marcar el cifrado AES-CBC como deprecated y añadir feature flag de migración,
para preparar la migración sin riesgo en Sprint 1 y ejecutar el cutover en Sprint 2.

**Hallazgos V2:** CRIT-005, CRIT-006 | **FR:** FR-AUTH-008

**Acceptance Criteria:**

**Given** el sistema arranca con `API_KEY_CIPHER=aes-cbc` (valor actual/legacy)
**When** el módulo de cifrado se inicializa
**Then** se emite un warning en logs `[DEPRECATED] AES-CBC cipher is deprecated, migration to AES-GCM required`

**Given** el código de `EncryptionService`
**When** se revisa
**Then** existe el feature flag `AES_CBC_LEGACY_READS` con valor por defecto `false`
**And** el servicio acepta ambos formatos de ciphertext solo cuando `AES_CBC_LEGACY_READS=true`

**Given** el staging environment con datos reales
**When** se ejecuta `scripts/aes-gcm-migration.dry-run.ts`
**Then** el script reporta el número de registros que necesitan migración sin modificar nada

---

### Story 2.2: Implementar `EncryptionService` con AES-256-GCM

Como sistema,
quiero cifrar y descifrar datos sensibles con AES-256-GCM,
para garantizar confidencialidad e integridad del material criptográfico en reposo.

**Hallazgos V2:** CRIT-005 | **FR:** FR-AUTH-008, FR-DATA-006

**Acceptance Criteria:**

**Given** una llamada a `encryptionService.encrypt('dato-sensible')`
**When** se ejecuta
**Then** retorna un string base64 que contiene IV (12 bytes) + auth tag (16 bytes) + ciphertext
**And** dos llamadas con el mismo input producen outputs distintos (IV aleatorio)

**Given** un ciphertext producido por `encrypt()`
**When** se pasa a `decrypt()`
**Then** retorna el plaintext original

**Given** un ciphertext con el auth tag modificado (tampering)
**When** se pasa a `decrypt()`
**Then** lanza error `DecryptionIntegrityError` — autenticidad fallida

**Given** `AES_CBC_LEGACY_READS=true` y un ciphertext en formato CBC legacy
**When** se pasa a `decrypt()`
**Then** se descifra con el path legacy y se loguea warning de migración pendiente

**Given** `AES_CBC_LEGACY_READS=false` y un ciphertext en formato CBC legacy
**When** se pasa a `decrypt()`
**Then** lanza error `UnknownCipherFormatError` — no acepta formato legacy

---

### Story 2.3: Migración dual-write AES-GCM en producción

Como equipo de operaciones,
quiero ejecutar la migración de cifrado con dual-write durante 30 días y rollback documentado,
para no corromper las API keys existentes en producción.

**Hallazgos V2:** CRIT-006, AUTH-006 | **FR:** FR-AUTH-008

**Acceptance Criteria:**

**Given** el entorno de staging con `AES_CBC_LEGACY_READS=true` activado
**When** se crea una nueva API key
**Then** se almacena con cifrado AES-GCM (nuevo formato)

**Given** el entorno de staging con `AES_CBC_LEGACY_READS=true`
**When** se lee una API key cifrada en formato legacy CBC
**Then** se descifra correctamente y se reencripta en GCM al guardar (dual-write)

**Given** el runbook `docs/runbooks/aes-gcm-migration.md`
**When** el equipo lo revisa
**Then** contiene: pasos de dry-run, cutover gradual (5%→25%→100%), métrica de decrypt failures, procedimiento de rollback con `API_KEY_CIPHER=aes-cbc`, y fecha de cutover completo (día 35)

**Given** más del 0.1% de operaciones de decrypt fallan tras el cutover
**When** el sistema lo detecta
**Then** la alerta `aes_gcm_migration_failure_rate` se dispara y el runbook indica revertir `AES_CBC_LEGACY_READS=false`

---

### Story 2.4: API Keys con 256 bits aleatorios e invalidación de keys legacy

Como sistema de gestión de API keys,
quiero generar API keys usando `crypto.randomBytes(32)` en lugar de `SHA256(domain)`,
para que las API keys sean impredecibles para un atacante que conozca el dominio del cliente.

**Hallazgos V2:** CRIT-007, AUTH-002 | **FR:** FR-AUTH-007

**Acceptance Criteria:**

**Given** una llamada al endpoint `POST /api-keys/create`
**When** el sistema genera la API key
**Then** usa `crypto.randomBytes(32).toString('hex')` — 64 caracteres hex, 256 bits de entropía

**Given** las API keys existentes generadas con `SHA256(domain)`
**When** se ejecuta el script de invalidación `scripts/invalidate-legacy-api-keys.ts`
**Then** todas las keys legacy son marcadas como `status: revoked` en la base de datos

**Given** una API key legacy revocada
**When** se usa en un request
**Then** el sistema retorna 401 con mensaje "API key revocada — solicite una nueva key"

**Given** un cliente con API key revocada consultando `GET /api-keys/status`
**When** recibe la respuesta
**Then** el campo `status` indica `revoked` y el campo `renewalRequired: true`

---

### Story 2.5: Endpoint de estado y rotación de API keys con ventana de gracia

Como cliente del API (plugin WordPress),
quiero poder consultar el estado de mi API key y ejecutar rotación con ventana de gracia de 30 días,
para actualizar mi configuración sin interrupción de servicio.

**Hallazgos V2:** AUTH-009, API-028 | **FR:** FR-AUTH-009, FR-AUTH-010, FR-API-009

**Acceptance Criteria:**

**Given** una API key activa sin expiración próxima
**When** el cliente hace `GET /api-keys/status`
**Then** la respuesta incluye `{ status: 'active', daysUntilExpiry: null, renewalRequired: false }`

**Given** una API key que supera 90 días sin rotación
**When** el sistema la verifica
**Then** el campo `status` es `expiring_soon` y se emite warning en el audit log

**Given** un cliente que solicita rotación de su API key
**When** hace `POST /api-keys/rotate`
**Then** se genera una nueva key, la antigua entra en estado `rotation_in_grace_window` con TTL de 30 días
**And** ambas keys son aceptadas durante los 30 días de ventana
**And** response headers `Deprecation` y `Sunset` (RFC 8594) se sirven en cada request con la key antigua

---

## Epic 3: Guard Pipeline Fail-Closed y Contexto Tenant

**Objetivo:** Invertir el default del RolesGuard a fail-closed, establecer orden fijo de guards, e implementar los tres decoradores de tenant context obligatorios en todos los controllers.

---

### Story 3.1: Prerrequisito — Audit de endpoints con roles y visibilidad esperada

Como equipo de desarrollo,
quiero tener un inventario firmado de los 140+ endpoints con su autenticación y rol requerido,
para poder activar RolesGuard fail-closed sin romper el sistema.

**Hallazgos V2:** CRIT-008, AUTH-019 | **FR:** FR-AUTHZ-001 (prerrequisito)

**Acceptance Criteria:**

**Given** el repositorio de controllers NestJS
**When** se genera el archivo `security-contracts/endpoint-roles-audit.md`
**Then** lista cada endpoint (método + path) con: auth requerida (`@Public`, `@Roles('admin')`, `@Roles('commercial')`, `@Roles('admin','commercial')`), y decorador de tenant context esperado

**Given** el archivo `security-contracts/endpoint-roles-audit.md`
**When** Roger lo revisa y firma
**Then** el archivo tiene un campo `approvedBy: Roger Puga` y `approvedDate: YYYY-MM-DD` en el frontmatter

**Given** el audit firmado
**When** se compara contra el código actual
**Then** se identifican explícitamente los endpoints que actualmente no tienen guard y que deberán tenerlo tras activar fail-closed

---

### Story 3.2: RolesGuard fail-closed con activación progresiva

Como sistema de autorización,
quiero que el RolesGuard rechace con 403 cualquier endpoint autenticado sin `@Roles()` o `@Public()` explícito,
para eliminar el vector de escalada de privilegios por endpoints sin decorador.

**Hallazgos V2:** CRIT-008, AUTH-019, AUTH-020 | **FR:** FR-AUTHZ-001

**Acceptance Criteria:**

**Given** un endpoint autenticado sin `@Roles()` ni `@Public()`
**When** se hace una petición con JWT válido
**Then** el sistema retorna 403 — fail-closed activado

**Given** un endpoint marcado con `@Public()`
**When** se hace una petición sin JWT
**Then** el sistema procesa la petición normalmente — excepción explícita registrada

**Given** la feature flag `STRICT_ROLES=true` en staging durante 48h
**When** el dashboard comercial y el plugin WP operan normalmente
**Then** no se registran errores 403 en endpoints legítimos — confirmación antes de activar en producción

**Given** el código del RolesGuard
**When** se revisa el método `canActivate`
**Then** la lógica es: si no hay roles definidos en el handler → `throw new ForbiddenException()` (antes era `return true`)

---

### Story 3.3: TenantContextGuard e implementación de los tres decoradores

Como sistema de aislamiento de datos,
quiero que cada controller declare exactamente uno de los decoradores de tenant context,
para que el `companyId` siempre esté disponible y verificado en el scope correcto.

**Hallazgos V2:** DATA-001…DATA-021, CRIT-005 | **FR:** FR-AUTHZ-002, FR-AUTHZ-003, FR-AUTHZ-004

**Acceptance Criteria:**

**Given** los tres decoradores `@RequireTenantContext()`, `@OptionalTenantContext()`, `@NoTenantContext()` implementados
**When** un controller tiene `@RequireTenantContext()` y llega una petición con JWT que contiene `companyId`
**Then** el `TenantContextGuard` extrae el `companyId` del JWT y lo inyecta en el request bajo `req.tenantContext.companyId`

**Given** una petición a un endpoint con `@RequireTenantContext()` con un JWT sin `companyId`
**When** el guard intenta extraer el contexto
**Then** retorna 403 — contexto de tenant requerido y ausente

**Given** una petición a un endpoint con `@RequireTenantContext()` donde el path tiene `:companyId` distinto al del JWT
**When** el guard valida
**Then** retorna 403 — companyId en path no coincide con el del token

**Given** un endpoint con `@NoTenantContext()` (ej. `/jwks`, `/health`)
**When** se hace una petición sin JWT
**Then** el guard no bloquea — sin tenant requerido

---

### Story 3.4: Aplicar decoradores de tenant context a los 25 controllers

Como equipo de desarrollo,
quiero que todos los controllers existentes tengan el decorador de tenant context correcto,
para que el sistema sea consistente y el lint rule enforcement funcione correctamente.

**Hallazgos V2:** DATA-001…DATA-021 | **FR:** FR-AUTHZ-002

**Acceptance Criteria:**

**Given** los 25 controllers del sistema
**When** se aplican los decoradores según el audit `endpoint-roles-audit.md`
**Then** 23 controllers tienen `@RequireTenantContext()`, y los 2 restantes (auth flows, JWKS) tienen `@NoTenantContext()`

**Given** un controller al que se añade `@RequireTenantContext()`
**When** se ejecuta el test de integración del endpoint correspondiente con JWT válido
**Then** el endpoint responde sin cambios en el contrato público — backward compatible

**Given** todos los controllers actualizados
**When** se ejecuta `npm run lint`
**Then** la regla `require-tenant-context-decorator` no reporta ningún error

---

### Story 3.5: Cerrar endpoints públicos sin autenticación

Como sistema,
quiero que todos los endpoints identificados como incorrectamente públicos en la auditoría V2 estén protegidos,
para eliminar los vectores de ataque de escaneo de endpoints sin auth.

**Hallazgos V2:** API-001, API-004, API-008, API-009, API-032 | **FR:** FR-API-004, FR-AUTHZ-001

**Acceptance Criteria:**

**Given** una petición a `POST /open-search/*` en entorno de producción (`NODE_ENV=production`)
**When** el sistema procesa la petición
**Then** retorna 404 — el controller no está registrado en el AppModule de producción

**Given** una petición a `POST /auth/user/register` con `roles: ["SUPER_ADMIN"]` en el body
**When** el sistema procesa el registro
**Then** el campo `roles` del body es ignorado completamente — roles solo asignados por admin autenticado

**Given** una petición a `POST /sync-keycloak` sin JWT
**When** el sistema procesa la petición
**Then** retorna 401 — endpoint protegido con `@UseGuards(AuthGuard)`

**Given** el `CommercialController`
**When** se revisa su código
**Then** `@UseGuards(AuthGuard, RolesGuard)` está activo — no comentado

---

### Story 3.6: Contrato endpoint-protections.yaml y ValidationPipe global

Como equipo de CI/CD,
quiero tener el contrato YAML de todos los endpoints y el ValidationPipe global configurado,
para que las validaciones de CI puedan leer el estado esperado del sistema.

**Hallazgos V2:** API-001…API-036, API-003, API-008 | **FR:** FR-API-001, FR-API-005, FR-API-007, FR-API-008

**Acceptance Criteria:**

**Given** el archivo `security-contracts/endpoint-protections.yaml`
**When** se revisa
**Then** contiene todos los controllers HTTP (25) y eventos WebSocket (13) con sus controles declarados

**Given** el `ValidationPipe` global en `main.ts`
**When** se configura
**Then** tiene `{ whitelist: true, forbidNonWhitelisted: true, transform: true }` — propiedades no declaradas en DTOs son rechazadas

**Given** el `ValidationPipe` global activo
**When** se envía una petición con campos extra no declarados en el DTO
**Then** la petición retorna 400 con detalle de las propiedades rechazadas

**Given** Swagger/OpenAPI en configuración
**When** `NODE_ENV === 'production'`
**Then** el módulo `SwaggerModule` no está registrado — Swagger deshabilitado en producción

---

## Epic 4: Rate Limiting con Redis y Backoff Progresivo

**Objetivo:** Reemplazar el rate limiter in-memory (inútil con múltiples réplicas) por un store Redis compartido, e implementar backoff exponencial en endpoints de autenticación para resistir credential stuffing.

---

### Story 4.1: Redis como store compartido para rate limiter

Como sistema,
quiero que el rate limiter use Redis como store en lugar de memoria,
para que el throttling funcione correctamente con múltiples réplicas del proceso Node.

**Hallazgos V2:** API-015, WS-003 | **FR:** FR-API-003, FR-WS-005

**Acceptance Criteria:**

**Given** dos réplicas del proceso Node corriendo en paralelo
**When** una IP envía 60 requests distribuidos (30 a cada réplica) en 1 minuto contra un endpoint con límite 50/min
**Then** las peticiones 51-60 son rechazadas con 429 — el contador es compartido vía Redis

**Given** Redis no disponible
**When** el rate limiter intenta incrementar el contador
**Then** el sistema cae a fail-open (permite la petición) y emite la métrica `redis_unavailable_total`

**Given** la configuración del módulo ThrottlerModule
**When** se revisa
**Then** usa `ThrottlerStorageRedisService` con la misma instancia Redis que el WS adapter (namespace `rl:`)

---

### Story 4.2: Backoff exponencial en endpoints de autenticación

Como sistema de autenticación,
quiero aplicar backoff exponencial tras intentos fallidos de login,
para hacer inviable el credential stuffing sin bloquear a usuarios legítimos que escriben mal su contraseña.

**Hallazgos V2:** AUTH-004, AUTH-005 | **FR:** FR-AUTH-005

**Acceptance Criteria:**

**Given** una IP que envía 3 intentos de login fallidos seguidos
**When** envía el 4º intento
**Then** el sistema retorna 429 con header `Retry-After: 1` — debe esperar 1 segundo

**Given** la misma IP que ya acumuló backoff, enviando el 5º intento tras esperar 1s
**When** el 5º también falla
**Then** `Retry-After: 5` — 5 segundos de espera

**Given** el 6º intento fallido
**When** se procesa
**Then** `Retry-After: 30` — 30 segundos

**Given** el 7º intento fallido
**When** se procesa
**Then** la tupla (IP, user) queda bloqueada 15 minutos

**Given** un usuario legítimo que teclea mal la contraseña 3 veces y luego la escribe correctamente
**When** el login exitoso se procesa
**Then** el contador de backoff para esa tupla (IP, user) se resetea a 0

**Given** el mismo `userId` recibe 50 intentos fallidos en 1 hora desde distintas IPs
**When** se evalúa el contador global por user
**Then** el user queda bloqueado 1 hora para todas las IPs y se registra alerta en audit log

---

## Epic 5: Injection Prevention

**Objetivo:** Cerrar los tres vectores de inyección activos: SQL injection en CriteriaConverter, SSRF en endpoints con URLs externas, y prototype pollution en el body parser.

---

### Story 5.1: CriteriaConverter con whitelist de campos por entidad

Como sistema de queries dinámicas,
quiero que el CriteriaConverter rechace campos no declarados en la whitelist de cada entidad,
para eliminar el riesgo de SQL injection mediante manipulación de nombres de campo.

**Hallazgos V2:** CRIT-009, INJ-001, INJ-004 | **FR:** FR-INJ-001

**Acceptance Criteria:**

**Given** una query con campo `status` que está en la whitelist de `Chat`
**When** el CriteriaConverter la procesa
**Then** genera la query parametrizada correctamente

**Given** una query con campo `'; DROP TABLE chats; --` o cualquier campo no en whitelist
**When** el CriteriaConverter la procesa
**Then** retorna `err(new InvalidCriteriaFieldError(fieldName))` sin ejecutar nada

**Given** los payloads de SQL injection del OWASP Testing Guide (incluye `1=1`, `' OR '1'='1'`, `NULL`, null bytes)
**When** se ejecuta la suite de tests `criteria-converter.injection.spec.ts`
**Then** todos los payloads retornan error de validación — 0 queries ejecutadas

**Given** el `CriteriaConverter` sin whitelist definida para una entidad
**When** se intenta instanciar
**Then** lanza `MissingWhitelistError` en startup — falla rápido, no silencioso

---

### Story 5.2: URL Allowlist Validator para prevención de SSRF

Como sistema,
quiero que todos los endpoints que aceptan URLs externas las validen contra una allowlist,
para prevenir SSRF (Server-Side Request Forgery) hacia endpoints internos o de metadata cloud.

**Hallazgos V2:** CRIT-010, INJ-003 | **FR:** FR-INJ-002

**Acceptance Criteria:**

**Given** una petición a `POST /llm/config` con `baseUrl: 'http://169.254.169.254/latest/meta-data/'`
**When** el sistema valida la URL
**Then** retorna 400 — dirección de metadata de cloud bloqueada

**Given** `baseUrl: 'http://192.168.1.1/admin'`
**When** el sistema valida
**Then** retorna 400 — RFC 1918 bloqueado

**Given** `baseUrl: 'http://localhost:5432'`
**When** el sistema valida
**Then** retorna 400 — localhost bloqueado

**Given** `baseUrl: 'http://openai.com/api'` (HTTP sin TLS)
**When** el sistema valida
**Then** retorna 400 — solo HTTPS permitido

**Given** `baseUrl: 'https://api.openai.com/v1'` (host permitido, HTTPS)
**When** el sistema valida
**Then** la validación pasa — URL en allowlist

**Given** el endpoint `POST /leads/admin/test-connection`
**When** se revisa su implementación
**Then** también usa `UrlAllowlistValidator` con el mismo rigor

---

### Story 5.3: Protección contra prototype pollution en body parser

Como sistema,
quiero que el body parser elimine claves peligrosas (`__proto__`, `constructor`, `prototype`) antes de procesar el body,
para prevenir pollution del prototipo de Object que podría afectar la lógica de la aplicación.

**Hallazgos V2:** CRIT-011, INJ-005 | **FR:** FR-INJ-003

**Acceptance Criteria:**

**Given** una petición con body `{ "__proto__": { "isAdmin": true } }`
**When** el middleware sanitizador procesa el body
**Then** el campo `__proto__` es eliminado antes de llegar al handler

**Given** una petición con body `{ "user": { "constructor": { "name": "Admin" } } }`
**When** el middleware procesa el body
**Then** el campo `constructor` anidado es eliminado en cualquier nivel de profundidad

**Given** una petición con body limpio `{ "name": "John", "email": "john@example.com" }`
**When** el middleware procesa el body
**Then** el body llega al handler intacto — sin modificaciones

**Given** tests unitarios del middleware de sanitización
**When** se ejecutan con payloads de prototype pollution (incluye anidado, arrays, circular ref)
**Then** todos retornan el body sanitizado sin errores

---

### Story 5.4: Queries Mongoose con proyección explícita

Como sistema de persistencia,
quiero que todas las queries Mongoose usen proyección explícita y prohiban operadores inseguros,
para evitar exposición involuntaria de campos y injection vía operadores especiales.

**Hallazgos V2:** INJ-006, INJ-007 | **FR:** FR-INJ-004

**Acceptance Criteria:**

**Given** el código de todos los repositorios V2
**When** se revisan los métodos de query
**Then** ninguna query usa `$where`, `$function`, o `mapReduce` con input de usuario

**Given** queries que retornan documentos con campos sensibles (e.g. `apiKey`, `refreshToken`)
**When** se ejecutan sin proyección explícita
**Then** la lint rule `no-mongoose-select-star` advierte en CI (implementada en Sprint 2 ESLint plugin)

---

## Epic 6: Multi-Tenant Data Isolation

**Objetivo:** Implementar las tres capas defensivas de aislamiento multi-tenant: companyId obligatorio en todos los schemas Mongo V2, `BaseTenantAwareRepository` como única vía de acceso, e isolation tests que prueban cross-tenant en cada aggregate.

---

### Story 6.1: Añadir `companyId` a los schemas Mongo V2 con backfill

Como sistema de multi-tenancy,
quiero que todos los documentos de entidades compartidas entre tenants tengan `companyId` obligatorio e indexado,
para que sea imposible almacenar o recuperar datos sin discriminador de tenant.

**Hallazgos V2:** DATA-001…DATA-004, DATA-007, DATA-012 | **FR:** FR-DATA-001, FR-DATA-004

**Acceptance Criteria:**

**Given** los schemas `ChatSchema`, `MessageSchema`, `CommercialSchema`, `TrackingEventSchema`, `VisitorSchema`, `ConsentSchema`, `SavedFilterSchema`, `LeadSchema`
**When** se revisan después de esta story
**Then** todos tienen `companyId: { type: String, required: true, index: true }`

**Given** el script de backfill `scripts/backfill-company-id.ts` ejecutado en staging
**When** completa sin errores
**Then** 0 documentos sin `companyId` en las colecciones afectadas (verificado con query de count)

**Given** el script de backfill es idempotente
**When** se ejecuta dos veces sobre los mismos datos
**Then** el resultado es idéntico — sin duplicados ni errores en segunda ejecución

**Given** un intento de guardar un documento sin `companyId`
**When** Mongoose valida el schema
**Then** lanza `ValidationError: companyId is required` sin tocar la base de datos

---

### Story 6.2: `BaseTenantAwareRepository` — única vía de acceso a datos multi-tenant

Como desarrollador,
quiero una clase base que garantice que toda query multi-tenant incluye filtro de companyId,
para hacer difícil por construcción el olvido del filtro de tenant.

**Hallazgos V2:** DATA-005, DATA-008, DATA-009, DATA-014 | **FR:** FR-DATA-002, FR-DATA-003, FR-DATA-005

**Acceptance Criteria:**

**Given** la clase `BaseTenantAwareRepository<TDoc, TDomain>` implementada
**When** un repositorio que la extiende llama a `findByIdWithinTenant(id, companyId)`
**Then** la query generada incluye `{ _id: id, companyId: companyId }` en el filtro — ambos campos siempre

**Given** un método en el repositorio que intenta llamar `this.model.findOne({ _id: id })` sin `companyId`
**When** se ejecuta `npm run lint`
**Then** la regla `no-mongo-query-without-tenant` falla con error explícito — query sin filtro de tenant detectada

**Given** una operación `updateMany` o `deleteMany`
**When** se llama sin `companyId` en el filtro
**Then** `buildTenantFilter` lanza `MissingTenantFilterError` antes de ejecutar la query

**Given** todos los repositorios V2 (`MongoChatRepositoryImpl`, `MongoMessageRepositoryImpl`, `MongoVisitorRepositoryImpl`, etc.)
**When** se refactorizan para extender `BaseTenantAwareRepository`
**Then** sus tests unitarios siguen pasando sin cambios en la interfaz pública

---

### Story 6.3: Isolation tests por aggregate V2

Como equipo de QA,
quiero isolation tests que validen cross-tenant para cada aggregate V2,
para tener evidencia automatizada de que el aislamiento de datos funciona correctamente.

**Hallazgos V2:** DATA-001…DATA-021 (verificación) | **FR:** FR-DATA-003, NFR-SEC-003

**Acceptance Criteria:**

**Given** un chat creado para `companyId: A`
**When** un repositorio lo busca con `companyId: B`
**Then** el resultado es `err(ChatNotFoundError)` — 404, no 403 (no filtrar existencia)

**Given** archivos `chat.isolation.spec.ts`, `message.isolation.spec.ts`, `visitor.isolation.spec.ts`, `commercial.isolation.spec.ts`, `tracking-event.isolation.spec.ts`, `consent.isolation.spec.ts`
**When** se ejecutan con `npm run test:isolation`
**Then** todos pasan — 0 fallos de cross-tenant

**Given** un isolation test con `it.skip`
**When** CI ejecuta el pipeline
**Then** la build falla — skip en archivos `*isolation*.spec.ts` prohibido

**Given** coverage de los archivos `*isolation*.spec.ts`
**When** se verifica en CI
**Then** el branch coverage es ≥90% — gate activo

---

### Story 6.4: `TenantContextInterceptor` — inyección automática de companyId en handlers

Como sistema de autorización,
quiero que el companyId del JWT esté disponible automáticamente en todos los handlers CQRS,
para no tener que extraerlo manualmente en cada command/query handler.

**Hallazgos V2:** DATA-003, DATA-008, DATA-016 | **FR:** FR-AUTHZ-003

**Acceptance Criteria:**

**Given** un command handler con `@RequireTenantContext()` en su controller
**When** se ejecuta el command
**Then** el `companyId` está disponible en el command como `command.companyId` sin lógica manual de extracción

**Given** un handler que intenta construir un command sin `companyId` desde un controller con `@RequireTenantContext()`
**When** TypeScript compila
**Then** el compilador fuerza el campo `companyId` como requerido — error de compilación si se omite

**Given** el `TenantContextInterceptor` registrado globalmente
**When** un endpoint con `@NoTenantContext()` procesa una petición
**Then** el interceptor no inyecta nada — no interfiere con flujos sin tenant

---

## Epic 7: WebSocket Hardening

**Objetivo:** Proteger el gateway Socket.IO con Redis adapter para multi-réplica, handshake que solo acepta JWT, validación de tenant por evento, y room names con prevención de separator injection.

---

### Story 7.1: Redis adapter para Socket.IO en producción

Como sistema de WebSocket,
quiero que Socket.IO use Redis adapter en producción,
para que los mensajes entre replicas del proceso se enruten correctamente.

**Hallazgos V2:** WS-003, WS-012 | **FR:** FR-WS-001

**Acceptance Criteria:**

**Given** dos réplicas del proceso en producción y un usuario conectado a réplica A y un comercial a réplica B
**When** el comercial envía un mensaje al chat del usuario
**Then** el usuario recibe el mensaje — routing cross-replica funcionando vía Redis pub/sub

**Given** el proceso arranca con `NODE_ENV=production` y sin `REDIS_URL` configurada
**When** el módulo WS se inicializa
**Then** el arranque falla con error `RedisIoAdapter: REDIS_URL is required in production`

**Given** el proceso arranca con `NODE_ENV=development` sin Redis
**When** el módulo WS se inicializa
**Then** usa in-memory adapter — Redis no requerido en desarrollo

---

### Story 7.2: Handshake WebSocket con JWT obligatorio

Como sistema de autenticación WebSocket,
quiero que el handshake Socket.IO solo acepte conexiones con JWT válido,
para que visitantes anónimos no puedan unirse a salas de empresas ajenas.

**Hallazgos V2:** WS-001, WS-002 | **FR:** FR-WS-002

**Acceptance Criteria:**

**Given** una conexión WebSocket sin `auth.token` en el handshake
**When** el gateway intenta procesarla
**Then** la conexión es rechazada con `disconnect` inmediato — no se une a ninguna sala

**Given** una conexión con JWT válido que contiene `companyId` y `sub` (visitorId)
**When** el handshake es procesado
**Then** `socket.data.companyId` y `socket.data.visitorId` se establecen desde el payload JWT
**And** el body de handshake `{ tenantId, visitorId }` se ignora completamente

**Given** una conexión con `auth.token` que es un JWT expirado
**When** el gateway lo verifica
**Then** la conexión es rechazada con `disconnect` — token inválido

---

### Story 7.3: Tenant guard en eventos WebSocket

Como sistema de autorización WebSocket,
quiero que cada evento con `tenant_guard: required` en el YAML valide que el recurso pertenece al companyId del socket,
para que un comercial no pueda acceder a chats de otra empresa.

**Hallazgos V2:** WS-004, WS-005 | **FR:** FR-WS-003

**Acceptance Criteria:**

**Given** un socket de empresa A que envía evento `join-chat` con `chatId` de empresa B
**When** el gateway procesa el evento
**Then** retorna `WsException` con código 403 y el socket no se une a la sala

**Given** un socket de empresa A que envía evento `join-chat` con `chatId` de empresa A
**When** el gateway procesa el evento
**Then** el socket se une a la sala correctamente

**Given** el test `test/security/ws-protections.spec.ts` leyendo el YAML de eventos
**When** se ejecuta en CI
**Then** verifica que cada evento listado con `tenant_guard: required` tiene guard implementado en el handler correspondiente

---

### Story 7.4: Room name helper con validación de separator injection

Como sistema WebSocket,
quiero que los nombres de sala se construyan siempre con el helper `buildRoomName()`,
para que `:`, `/` u otros caracteres de control no puedan usarse para injection en namespaces.

**Hallazgos V2:** WS-006, WS-011 | **FR:** FR-WS-004

**Acceptance Criteria:**

**Given** una llamada a `buildRoomName({ type: 'visitor', id: 'uuid-valido', companyId: 'uuid-valido' })`
**When** se ejecuta
**Then** retorna `'visitor:companyId:uuid-valido'` sin error

**Given** una llamada con `id: 'abc:commercial'` (separator injection)
**When** se ejecuta
**Then** lanza `WsException('ID con caracteres inválidos')` — separadores en IDs rechazados

**Given** una llamada con `id: '../etc/passwd'` (path traversal)
**When** se ejecuta
**Then** lanza `WsException` — caracteres fuera del patrón `[a-zA-Z0-9\-_]` rechazados

**Given** el código de todos los handlers WS del gateway
**When** análisis estático busca template literals para construir nombres de sala
**Then** 0 ocurrencias — todos usan `buildRoomName()`

---

## Epic 8: Observabilidad, Logs y Gestión de Secretos

**Objetivo:** Sanitizar todos los logs que contienen secretos, implementar el audit trail inmutable para eventos de seguridad, y establecer el procedimiento de rotación de credenciales.

---

### Story 8.1: Sanitización de logs — eliminar secretos y PII

Como sistema de observabilidad,
quiero que los logs nunca contengan secretos, tokens JWT ni PII,
para cumplir GDPR art. 5.1.f y eliminar el riesgo de exfiltración de credenciales vía logs.

**Hallazgos V2:** CRIT-001, INFRA-001, INFRA-002, OBS-001, OBS-007 | **FR:** FR-OBS-001, FR-OBS-002, FR-GDPR-005

**Acceptance Criteria:**

**Given** que la aplicación loguea el inicio de módulos (app.module.ts actual)
**When** se ejecuta y se revisan los logs generados
**Then** ningún log contiene `JWT_SECRET`, `JWT_PRIVATE_KEY`, valores de `Authorization` headers, ni patrones `eyJ` (JWT)

**Given** el logger Pino configurado con redactors sobre campos sensibles
**When** un handler loguea un objeto `{ userId: '123', token: 'eyJhbGciOiJSUzI1...' }`
**Then** el log muestra `{ userId: '123', token: '[REDACTED]' }`

**Given** el código de `auth-visitor-jwt.ts:69,71,101,103,144-163`
**When** se revisa
**Then** los logs de claves RSA privadas están eliminados — no hay `console.log(privateKey)` ni similar

**Given** `npm run lint` con la regla `no-console-log`
**When** se ejecuta
**Then** 0 ocurrencias de `console.log`, `console.error`, `console.warn` en archivos de producción (`src/**`)

---

### Story 8.2: Gitleaks y trufflehog en pre-commit y CI

Como equipo de desarrollo,
quiero que secretos detectados bloqueen el commit y el merge,
para que credenciales nunca lleguen al repositorio ni a producción.

**Hallazgos V2:** INFRA-001, OBS-003 | **FR:** FR-OBS-003, NFR-SEC-004

**Acceptance Criteria:**

**Given** un commit que incluye un archivo con `AWS_ACCESS_KEY_ID=AKIA...`
**When** el pre-commit hook se ejecuta
**Then** el commit es bloqueado con mensaje de gitleaks indicando el secreto detectado

**Given** el mismo secreto en un PR
**When** el CI job `secret-scan` se ejecuta
**Then** el pipeline falla y el merge queda bloqueado

**Given** un repositorio limpio sin secretos
**When** `gitleaks detect --source . --no-git` se ejecuta
**Then** retorna exit code 0 — sin hallazgos

---

### Story 8.3: Audit Trail — colección inmutable con eventos de seguridad

Como sistema de compliance,
quiero persistir eventos de seguridad en una colección inmutable con retención de 2 años,
para cumplir GDPR art. 30 y soportar investigación de incidentes.

**Hallazgos V2:** OBS-005, GDPR art. 30 | **FR:** FR-OBS-006, NFR-OBS-001, NFR-COMP-002

**Acceptance Criteria:**

**Given** un usuario realiza un login exitoso
**When** el sistema lo procesa
**Then** un documento `{ eventType: 'login', actorId, actorType: 'user', companyId, timestamp }` se almacena en `audit_logs` en <5s (P99)

**Given** los eventos: login, logout, role_change, api_key_create, api_key_revoke, consent_change, access_denied, visitor_erasure
**When** ocurren en el sistema
**Then** cada uno genera un documento en `audit_logs` — cobertura 100%

**Given** un intento de `deleteOne` sobre la colección `audit_logs` para un documento con `timestamp < now - 2 años`
**When** el guard de repositorio evalúa la operación
**Then** lanza `AuditLogImmutabilityError` — borrado bloqueado

**Given** el `AuditLogInterceptor` configurado como fire-and-forget
**When** la escritura al audit log falla (MongoDB no disponible)
**Then** el request principal retorna 200 normalmente — el fallo del audit no bloquea el flujo
**And** se emite la métrica `audit_write_failure_total`

---

### Story 8.4: Rotación de credenciales productivas

Como equipo de operaciones,
quiero un runbook documentado y probado para rotar todas las credenciales productivas,
para eliminar el riesgo activo de las credenciales expuestas identificadas en el informe V2.

**Hallazgos V2:** INFRA-002, OBS-004 | **FR:** FR-OBS-004, NFR-AVAIL-003

**Acceptance Criteria:**

**Given** el runbook `docs/runbooks/secret-rotation.md`
**When** el equipo lo revisa
**Then** documenta la rotación de: AWS keys, Resend API key, Groq API key, JWT_SECRET, JWT_PRIVATE_KEY, MongoDB passwords, PostgreSQL passwords

**Given** el procedimiento ejecutado una vez en staging
**When** completa
**Then** el sistema en staging responde sin downtime — tiempo total de rotación ≤4h

**Given** las nuevas credenciales configuradas en el gestor de secretos (KMS/Vault)
**When** se verifican
**Then** las credenciales antiguas (expuestas en `.env` del repo) están invalidadas a nivel del servicio externo (AWS, Resend, Groq)

---

## Epic 9: Infraestructura y Supply Chain

**Objetivo:** Hardening del Dockerfile (Node LTS 20, non-root, multi-stage), GH Actions (permissions mínimas, OIDC, SHA pins), Keycloak en modo producción, y MongoDB con mínimo privilegio.

---

### Story 9.1: Dockerfile con Node LTS 20, multi-stage y usuario non-root

Como equipo de operaciones,
quiero que el Dockerfile use Node LTS actual, build multi-stage y usuario sin privilegios de root,
para reducir la superficie de ataque del contenedor en producción.

**Hallazgos V2:** INFRA-005, INFRA-006 | **FR:** FR-INFRA-001

**Acceptance Criteria:**

**Given** el Dockerfile actualizado
**When** se construye la imagen
**Then** la stage final usa `node:20.19-alpine` (o LTS equivalente con tag específico, no `latest`)

**Given** la imagen construida
**When** se ejecuta `docker inspect <image>` o se verifica dentro del contenedor
**Then** el proceso Node corre como usuario `appuser` (no root, UID > 1000)

**Given** el build multi-stage
**When** se revisa el Dockerfile
**Then** la stage final no contiene `node_modules` de devDependencies ni archivos `.env.*`

**Given** el docker-compose productivo
**When** se revisa
**Then** los puertos de MongoDB (27017) y Redis (6379) no están expuestos al host — solo red interna Docker

---

### Story 9.2: GitHub Actions con permissions mínimas y OIDC para AWS

Como equipo de CI/CD,
quiero que los workflows de GH Actions usen permissions mínimas, OIDC para AWS y pins de SHA,
para eliminar los long-lived secrets y reducir el blast radius en caso de compromiso de pipeline.

**Hallazgos V2:** INFRA-008, INFRA-009, INFRA-010 | **FR:** FR-INFRA-002, FR-INFRA-003

**Acceptance Criteria:**

**Given** los workflows en `.github/workflows/`
**When** se revisan
**Then** cada job tiene `permissions:` explícita con el mínimo necesario (ej. `contents: read`)
**And** ningún job tiene `permissions: write-all` o hereda permisos amplios sin declaración

**Given** el workflow que hace deploy a AWS
**When** se revisa
**Then** usa `aws-actions/configure-aws-credentials` con OIDC (`role-to-assume`) — sin `AWS_ACCESS_KEY_ID` en secrets del repo

**Given** las actions usadas en los workflows (ej. `actions/checkout`, `actions/upload-artifact`)
**When** se revisan
**Then** están referenciadas por SHA completo, no por tag (ej. `actions/checkout@a5ac7e51b41094c92402da3b24376905380afc29`)

**Given** el workflow del CI
**When** se ejecuta en un PR
**Then** el job `secret-scan` corre primero y bloquea si hay hallazgos antes de cualquier otro paso

---

### Story 9.3: Keycloak en modo producción

Como sistema de identity provider,
quiero que Keycloak esté configurado en modo producción con TLS obligatorio y hostname estricto,
para eliminar el riesgo de operación en modo desarrollo en entornos productivos.

**Hallazgos V2:** INFRA-007, INFRA-012 | **FR:** FR-INFRA-004

**Acceptance Criteria:**

**Given** el entorno de producción con Keycloak configurado
**When** se intenta acceder a Keycloak por HTTP (sin TLS)
**Then** la conexión es rechazada — HTTP deshabilitado (`KC_HTTP_ENABLED=false`)

**Given** las variables de entorno del servidor Keycloak
**When** se verifican
**Then** `KC_HOSTNAME_STRICT=true` y `KC_HOSTNAME_STRICT_HTTPS=true` están configuradas

**Given** el backend verificando tokens de Keycloak
**When** se revisa la configuración del cliente OIDC
**Then** tiene `rejectUnauthorized: true` — TLS estricto en la conexión backend↔Keycloak

**Given** el comando de inicio de Keycloak
**When** se revisa en docker-compose o en el servidor
**Then** usa `kc.sh start --optimized` — no `start-dev`

---

### Story 9.4: MongoDB con TLS y mínimo privilegio

Como sistema de persistencia,
quiero que MongoDB use TLS en todas las conexiones y que el usuario de aplicación tenga mínimo privilegio,
para proteger los datos en tránsito y limitar el blast radius en caso de compromiso de credenciales.

**Hallazgos V2:** INFRA-003 | **FR:** FR-INFRA-005, FR-INFRA-006

**Acceptance Criteria:**

**Given** el connection string de MongoDB en producción
**When** se revisa la variable `MONGO_URI`
**Then** contiene `tls=true` y la autenticación usa `authSource=admin`

**Given** el usuario de base de datos `guiders_app`
**When** se verifica su configuración en MongoDB
**Then** solo tiene permisos `readWrite` sobre la database `guiders` — sin acceso a `admin`, `config` ni otras databases

**Given** el archivo `scripts/mongo-init.js`
**When** se revisa
**Then** no contiene passwords hardcodeados — usa `process.env.MONGO_INIT_PASSWORD`

**Given** el `npm audit` con `--audit-level=high`
**When** se ejecuta en CI
**Then** retorna exit code 0 — sin CVEs HIGH ni CRITICAL sin parche activo

---

## Epic 10: GDPR y Compliance

**Objetivo:** Implementar los derechos del titular de datos (erasure, portabilidad), audit log de accesos a PII, legal basis en consentimientos, y el inventario de campos PII verificable en CI.

---

### Story 10.1: Erasure — borrado en cascada de datos personales de un visitante

Como administrador del sistema,
quiero poder ejecutar el borrado completo de los datos de un visitante en todas las colecciones,
para cumplir con el derecho al olvido del GDPR art. 17 en plazo ≤7 días.

**Hallazgos V2:** GDPR-004 | **FR:** FR-GDPR-003, NFR-COMP-001

**Acceptance Criteria:**

**Given** un visitante con datos en chats, messages, tracking_events, leads, consents y la colección visitors
**When** se ejecuta `DELETE /visitors/:id/erasure` por un admin autenticado
**Then** todos sus datos personales son eliminados en cascada de todas las colecciones declaradas en `pii-inventory.yaml`
**And** un "tombstone" `{ _id, companyId, erasedAt, status: 'erased' }` permanece en la colección visitors para integridad referencial

**Given** el borrado completado
**When** se consulta cualquier colección de datos del visitante eliminado
**Then** 0 documentos con PII del visitante son encontrados (excepto el tombstone)

**Given** el test E2E `test/gdpr/visitor-erasure.e2e.spec.ts`
**When** se ejecuta
**Then** verifica ausencia de PII en cada colección declarada en el inventario

**Given** el CLI `node bin/guiders-cli.js forget-visitor --visitorId <uuid> --companyId <uuid>`
**When** se ejecuta
**Then** invoca el mismo `EraseVisitorCommand` internamente y loguea el resultado en audit trail

---

### Story 10.2: Audit Log de accesos a PII

Como sistema de compliance,
quiero registrar en el audit log cada acceso a datos personales de un visitante,
para cumplir GDPR art. 30 (RoPA) y soportar investigación de brechas de datos.

**Hallazgos V2:** GDPR-001 | **FR:** FR-GDPR-001, NFR-OBS-001

**Acceptance Criteria:**

**Given** un comercial que abre el perfil de un visitante (accede a nombre, email, teléfono)
**When** el handler procesa la petición
**Then** el `AuditLogInterceptor` registra `{ eventType: 'pii_access', actorId, actorType: 'commercial', companyId, resourceType: 'visitor', resourceId, timestamp, fields: ['name','email','phone'] }`

**Given** el audit log generado
**When** se revisa el campo `metadata`
**Then** no contiene los valores de PII — solo el tipo de campo y el ID del recurso (nunca el valor del dato personal)

**Given** endpoints que acceden a PII (visitor detail, chat messages, lead info)
**When** se revisa su implementación
**Then** tienen el decorador `@AuditLog({ eventType: 'pii_access', resourceType: 'visitor' })`

---

### Story 10.3: Legal basis en registros de consentimiento

Como sistema de consentimiento,
quiero que cada registro de consentimiento incluya la base legal GDPR invocada,
para poder demostrar a la AEPD bajo qué base legal se procesaron los datos.

**Hallazgos V2:** GDPR-003 | **FR:** FR-GDPR-002

**Acceptance Criteria:**

**Given** una petición de creación de consentimiento
**When** se procesa
**Then** el campo `legalBasis: 'consent' | 'legitimate_interest' | 'contract'` es obligatorio en el DTO — retorna 400 si ausente

**Given** los documentos de consentimiento existentes sin `legalBasis`
**When** se ejecuta el script de backfill
**Then** se les asigna `legalBasis: 'consent'` — base legal por defecto para consentimientos históricos

**Given** una revocación de consentimiento vía `POST /consents/:id/revoke`
**When** se procesa
**Then** es efectiva inmediatamente y el audit log registra el evento `consent_revoke`

---

### Story 10.4: Portabilidad de datos — export JSON de un visitante

Como titular de datos,
quiero poder exportar todos mis datos personales en formato JSON estructurado,
para ejercer el derecho de portabilidad del GDPR art. 20.

**Hallazgos V2:** GDPR-005 | **FR:** FR-GDPR-004, NFR-COMP-004

**Acceptance Criteria:**

**Given** una petición `GET /visitors/:id/data-export` de un admin autenticado de la misma empresa
**When** el sistema procesa la petición
**Then** retorna un JSON estructurado con todos los datos del visitante: perfil, chats, mensajes, eventos de tracking, leads, consentimientos

**Given** el export generado
**When** se revisa el contenido
**Then** incluye metadatos: `{ exportedAt, requestedBy, visitorId, companyId, dataCategories[] }`

**Given** el tiempo desde la petición de export hasta la entrega del JSON
**When** se mide
**Then** es <24h (P99) — se acepta respuesta asíncrona con poll endpoint si el volumen lo requiere

---

### Story 10.5: PII Inventory YAML con enforcement en CI

Como equipo de desarrollo,
quiero un inventario centralizado de todos los campos PII y un check en CI que detecte nuevos campos no declarados,
para que ningún dato personal se persista sin documentar su base legal y tipo.

**Hallazgos V2:** GDPR-002 | **FR:** FR-GDPR-005 (soporte), NFR-COMP-003

**Acceptance Criteria:**

**Given** el archivo `security-contracts/pii-inventory.yaml`
**When** se revisa
**Then** lista cada colección con sus campos PII, el tipo de dato y la base legal (`consent`, `legitimate_interest`, `contract`)

**Given** un schema Mongoose nuevo con un campo llamado `email` o `phone` o `name` o `dni`
**When** el pre-commit hook se ejecuta
**Then** verifica que el campo está declarado en el inventario — bloquea el commit si no está

**Given** el inventario completo
**When** se ejecuta el test `test/security/pii-inventory.spec.ts`
**Then** verifica que cada colección declarada en el inventario existe en MongoDB y cada campo PII tiene el tipo correcto

---

## Epic 11: DevSecOps Pipeline y Enforcement CI

**Objetivo:** Construir la infraestructura de enforcement automático que impide la regresión: ESLint plugin custom, tests YAML-driven de protección de endpoints y eventos WS, coverage gate en isolation tests, TimeProvider para time-travel tests, y el proceso formal de risk acceptance.

---

### Story 11.1: TimeProvider inyectable para tests de expiración

Como equipo de desarrollo,
quiero una abstracción `TimeProvider` que aísle toda la lógica de tiempo,
para poder escribir tests deterministas sobre grace windows de JWT, API keys y handshakes WS.

**Hallazgos V2:** (transversal) | **FR:** FR-CI-006, FR-CI-007

**Acceptance Criteria:**

**Given** la clase `TimeProvider` con interface `{ now(): number; nowDate(): Date }`
**When** se inyecta en módulos que usan `Date.now()` directamente (JWT expiry, API key TTL, WS handshake window)
**Then** los módulos usan `this.timeProvider.now()` — sin llamadas directas a `Date.now()`

**Given** un test de expiración de API key de 90 días
**When** usa `jest.useFakeTimers()` + `jest.setSystemTime(now + 91 * 24 * 60 * 60 * 1000)`
**Then** el test valida que la API key está en estado `expiring_soon` — sin flakiness

**Given** un test de ventana de gracia de rotación de API key (30 días)
**When** el tiempo simulado avanza a día 31
**Then** el test valida que la key vieja ya no es aceptada — comportamiento correcto verificado sin esperar 30 días reales

---

### Story 11.2: ESLint plugin `guiders-security` — reglas custom de tenant y guards

Como equipo de desarrollo,
quiero un ESLint plugin custom que detecte violaciones de patrones de seguridad en tiempo de lint,
para que los bugs de seguridad se detecten antes del code review y del CI.

**Hallazgos V2:** (enforcement transversal) | **FR:** FR-CI-002

**Acceptance Criteria:**

**Given** código con `model.findOne({ _id: id })` directamente (sin extender `BaseTenantAwareRepository`)
**When** se ejecuta `npm run lint`
**Then** la regla `no-mongo-query-without-tenant` falla con mensaje `Direct Mongoose query without tenant filter detected`

**Given** un controller autenticado sin `@RequireTenantContext`, `@OptionalTenantContext`, ni `@NoTenantContext`
**When** se ejecuta `npm run lint`
**Then** la regla `require-tenant-context-decorator` falla con mensaje `Controller missing tenant context decorator`

**Given** una string de 32+ caracteres hexadecimales hardcodeada en código fuente
**When** se ejecuta `npm run lint`
**Then** la regla `no-hardcoded-crypto-key` falla — posible clave criptográfica hardcodeada

**Given** tests unitarios del propio plugin (`eslint-plugin-guiders-security/__tests__/`)
**When** se ejecutan
**Then** todos pasan — las reglas detectan exactamente los casos previstos y no producen false positives en código válido

**Given** un `// eslint-disable-next-line guiders-security/no-mongo-query-without-tenant` sin texto de justificación
**When** el pre-commit hook verifica
**Then** el commit es bloqueado — override sin justificación prohibido

---

### Story 11.3: Test `endpoint-protections.spec.ts` YAML-driven

Como sistema de CI,
quiero un test que lea el contrato YAML de endpoints y verifique mediante reflection NestJS que cada controller declara los decoradores esperados,
para que cualquier endpoint añadido sin declarar sus controles falle el pipeline antes del merge.

**Hallazgos V2:** (enforcement transversal) | **FR:** FR-CI-001, FR-CI-002

**Acceptance Criteria:**

**Given** el test `test/security/endpoint-protections.spec.ts` leyendo `security-contracts/endpoint-protections.yaml`
**When** un controller del YAML tiene `auth: jwt_user` y `tenant_context: required`
**Then** el test verifica vía `Reflect.getMetadata` que el controller tiene `@UseGuards(AuthGuard, RolesGuard, TenantContextGuard)` y `@RequireTenantContext()`

**Given** un controller nuevo añadido al código sin su entrada en el YAML
**When** el test se ejecuta
**Then** falla con `Controller 'NewController' not found in endpoint-protections.yaml`

**Given** un endpoint en el YAML marcado como `must_disable_in_production: true`
**When** se ejecuta en `NODE_ENV=production` y el test verifica
**Then** el test falla si el controller está registrado en el AppModule de producción

**Given** los 25 controllers HTTP del sistema
**When** el test se ejecuta
**Then** todos pasan sin errores — cobertura completa

---

### Story 11.4: Test `ws-protections.spec.ts` para eventos WebSocket

Como sistema de CI,
quiero un test que valide la correspondencia entre el YAML de eventos WS y la implementación del gateway,
para que eventos sin guard o no declarados sean detectados automáticamente.

**Hallazgos V2:** (enforcement transversal) | **FR:** FR-CI-008

**Acceptance Criteria:**

**Given** el test `test/security/ws-protections.spec.ts` leyendo la sección `websocket.events` del YAML
**When** un evento tiene `tenant_guard: required`
**Then** el test verifica vía reflection sobre el handler `@SubscribeMessage` que tiene el guard de tenant implementado

**Given** un evento en el YAML sin implementación en el gateway
**When** el test se ejecuta
**Then** falla — discrepancia YAML↔código detectada

**Given** un evento en el gateway sin entrada en el YAML
**When** el test se ejecuta
**Then** falla — evento no declarado en el contrato

---

### Story 11.5: Coverage gate e impedir `.skip` en isolation tests

Como sistema de CI,
quiero que los isolation tests tengan coverage gate ≥90% branches y que el `.skip` esté prohibido,
para que la desactivación silenciosa de tests de seguridad sea imposible.

**Hallazgos V2:** (enforcement transversal) | **FR:** FR-CI-003, FR-CI-004

**Acceptance Criteria:**

**Given** un archivo `chat.isolation.spec.ts` con `it.skip('cross-tenant test', ...)`
**When** el pipeline CI ejecuta el step de verificación de skips
**Then** la build falla con mensaje `Skipped tests found in isolation/security spec file: chat.isolation.spec.ts`

**Given** `describe.skip` en un archivo `*security*.spec.ts`
**When** el pipeline lo detecta
**Then** la build falla — misma política

**Given** los isolation tests ejecutados sin skips
**When** el coverage de branches se calcula para archivos `*isolation*.spec.ts`
**Then** es ≥90% — gate activo en CI

---

### Story 11.6: Finding-to-FR mapping YAML y mutation testing

Como auditor V3,
quiero que exista un archivo YAML con la trazabilidad bidireccional entre hallazgos V2 y FRs, y que los módulos críticos tengan mutation testing,
para poder verificar que cada hallazgo del informe está cubierto por al menos una story.

**Hallazgos V2:** (transversal auditabilidad) | **FR:** FR-CI-005, FR-CI-009

**Acceptance Criteria:**

**Given** el archivo `security-contracts/finding-to-fr-mapping.yaml`
**When** el test `test/security/finding-mapping.spec.ts` lo valida en CI
**Then** verifica: (a) cada hallazgo P0/P1 en scope tiene al menos 1 FR mapeado, (b) cada FR tiene al menos 1 hallazgo origen, (c) FRs nuevos sin hallazgo directo tienen justificación explícita en el YAML

**Given** Stryker configurado para mutation testing sobre `src/context/auth/**` y repos V2 multi-tenant
**When** se ejecuta el job semanal de mutation testing en CI
**Then** el mutation score mínimo por módulo (configurable en `stryker.config.json`) se cumple — mutants no detectados generan alerta

---

### Story 11.7: Risk Acceptance — proceso formal con template y enforcement

Como equipo de gestión de riesgos,
quiero un proceso formal con template para documentar hallazgos aceptados con mitigación,
para que los riesgos residuales sean visibles, trazables y revisados periódicamente.

**Hallazgos V2:** (gestión de riesgos P1 tercos) | **FR:** FR-RISK-001…FR-RISK-004

**Acceptance Criteria:**

**Given** un hallazgo P1 que no puede cerrarse en Sprint 2
**When** el equipo documenta el risk acceptance en `security-contracts/risk-accepted/<finding-id>.md`
**Then** el archivo tiene frontmatter con todos los campos obligatorios: `finding_id`, `severity`, `compensating_mitigation`, `owner`, `reviewer`, `review_date`, `merge_sha`, `status: active`

**Given** el campo `reviewer` en el risk acceptance
**When** CI valida el archivo
**Then** verifica que el autor del archivo (git blame) no es el mismo que el implementador del commit referenciado en `merge_sha` — separación de roles

**Given** más de 3 archivos `status: active` en `security-contracts/risk-accepted/`
**When** el CI ejecuta el gate de risk acceptance
**Then** la build falla — límite de 3 P1 aceptados activos superado

**Given** el `review_date` de un risk acceptance dentro de los próximos 7 días
**When** el GH Action scheduled semanal se ejecuta
**Then** se abre automáticamente un issue en GitHub asignado al `owner` con el título `[RISK REVIEW] <finding_id> — revisión pendiente`

**Given** el risk acceptance formal para `redis-spof`
**When** se revisa el archivo `security-contracts/risk-accepted/redis-spof.md`
**Then** está creado, firmado por Roger, con `review_date` a 90 días y el plan de HA en Sprint 3 documentado como mitigación

---

## Validación Final

### Cobertura de FRs — Resumen

| Área | FRs | Stories que los cubren |
|---|---|---|
| FR-AUTH (13) | FR-AUTH-001…013 | Stories 1.1–1.8, 2.4–2.5 |
| FR-AUTHZ (6) | FR-AUTHZ-001…006 | Stories 3.1–3.5 |
| FR-API (9) | FR-API-001…009 | Stories 3.6, 4.1, 2.5 |
| FR-INJ (5) | FR-INJ-001…005 | Stories 5.1–5.4 |
| FR-DATA (6) | FR-DATA-001…006 | Stories 6.1–6.4, 2.2 |
| FR-WS (5) | FR-WS-001…005 | Stories 7.1–7.4 |
| FR-OBS (6) | FR-OBS-001…006 | Stories 8.1–8.4 |
| FR-INFRA (7) | FR-INFRA-001…007 | Stories 9.1–9.4 |
| FR-GDPR (5) | FR-GDPR-001…005 | Stories 10.1–10.5 |
| FR-CI (9) | FR-CI-001…009 | Stories 11.1–11.6 |
| FR-RISK (4) | FR-RISK-001…004 | Story 11.7 |
| **Total: 75 FRs** | | **Total: 46 stories** |

### Resumen por sprint

**Sprint 1 (P0 committed — 8 stories):**
- Story 1.1 — Fix kid JWT header
- Story 1.2 — Algorithms whitelist
- Story 1.3 — Validación iss/aud
- Story 1.5 — Eliminar fallback JWT_SECRET
- Story 3.1 — Prerrequisito audit de endpoints
- Story 3.2 — RolesGuard fail-closed
- Story 6.1 — companyId en schemas + backfill
- Story 8.1 — Sanitización de logs

**Sprint 1 (P0 stretch — si sprint avanza bien):**
- Story 2.1 — Deprecación AES-CBC + feature flag
- Story 3.5 — Cerrar endpoints sin auth
- Story 5.2 — URL Allowlist SSRF
- Story 5.3 — Prototype pollution guard
- Story 8.2 — Gitleaks en pre-commit + CI

**Sprint 2 (P1 ALTOS + Enforcement):**
- Todas las stories restantes (1.4, 1.6, 1.7, 1.8, 2.2–2.5, 3.3–3.4, 3.6, 4.1–4.2, 5.1, 5.4, 6.2–6.4, 7.1–7.4, 8.3–8.4, 9.1–9.4, 10.1–10.5, 11.1–11.7)

### Checklist de completitud ✅

- [x] Todos los 68 FRs del security PRD cubiertos por al menos una story
- [x] Todos los NFRs reflejados en ACs de stories
- [x] Stories organizadas por capacidad de seguridad (no por capa técnica)
- [x] Secuencia de Sprint 1 con dependencies explícitas
- [x] Prerrequisito (endpoint-roles-audit.md) identificado como bloqueante
- [x] Runbook AES-GCM con fases temporales explícitas (Story 2.3)
- [x] Redis SPOF documentado como risk acceptance (Story 11.7)
- [x] ACs en formato Given/When/Then testables
- [x] Cada story apunta a hallazgos V2 y FRs específicos
- [x] Finding-to-FR mapping YAML como artefacto de trazabilidad (Story 11.6)
