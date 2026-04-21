---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
workflowStatus: complete
classification:
  projectType: 'Backend API + WebSocket Server (NestJS v11, REST + Socket.IO)'
  subType: 'Security Hardening / Technical Debt Remediation'
  domain: 'MarTech / Conversational SaaS B2B multi-tenant (captación leads, chat visitor↔comercial, CRM integrations)'
  complexity: 'high'
  projectContext: 'brownfield'
  typicalConcerns:
    - 'PII leakage (nombre, email, teléfono, DNI)'
    - 'Cross-tenant data access (IDOR)'
    - 'Token forgery / JWT bypass'
    - 'SQL injection (CriteriaConverter dinámico)'
    - 'Secret management (AWS/Resend/Groq en .env)'
    - 'WebSocket impersonation / separator injection'
    - 'Supply chain (Dockerfile, GH Actions sin permissions)'
  complianceRequirements:
    - 'GDPR (obligatorio — requisito de primer nivel)'
    - 'OWASP ASVS Nivel 2 (recomendado como marco técnico de referencia)'
inputDocuments:
  - docs/SECURITY_AUDIT_2026_V2.md
  - docs/SECURITY_AUDIT_2026.md
  - docs/SECURITY_AUDIT_2026_DATA_ISOLATION.md
  - docs/SECURITY_AUDIT_2025_API.md
  - SECURITY_AUDIT_REPORT.md
  - AGENTS.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
workflowType: 'prd'
projectType: 'brownfield'
scope: 'Security Hardening P0+P1 (100 hallazgos del informe V2)'
audience: 'Equipo dev interno (Amelia, Quinn, Roger)'
successCriteria: '0 CRÍTICOS + 0 ALTOS en re-auditoría V3'
lastUpdated: 2026-04-21
---

# Product Requirements Document - Security Hardening guiders-backend

**Author:** Roger Puga
**Date:** 21/04/2026
**Tipo:** PRD técnico de remediación de seguridad (brownfield)
**Origen:** `docs/SECURITY_AUDIT_2026_V2.md` (166 hallazgos)

## Executive Summary

Este PRD define el alcance de **Security Hardening — guiders-backend**, un proyecto de remediación técnica que traduce los hallazgos P0 y P1 (prioridad Crítica y Alta) del informe de auditoría de seguridad interna V2 (`docs/SECURITY_AUDIT_2026_V2.md`, 2026-04-21, 166 hallazgos totales) en un conjunto acotado de requisitos funcionales y no funcionales ejecutables por el equipo de desarrollo. El alcance se limita a los ~100 hallazgos P0+P1; los 66 hallazgos restantes (MEDIA/BAJA) quedan fuera de scope y se tratarán como backlog post-hardening.

El objetivo único y verificable es: **reducir a cero los hallazgos de severidad CRÍTICA y ALTA en una re-auditoría V3 ejecutada sobre el mismo código al final del proyecto**, medida con la misma metodología y criterios del informe V2. Hallazgos aceptados con mitigación documentada (risk acceptance firmada) cuentan como cerrados.

No es un proyecto con audiencia externa, deadline contractual, presión regulatoria ni incidente detonante. Es higiene técnica proactiva: el informe V2 ya evidenció los huecos (archivo:línea, CVSS, CWE, snippet) y este PRD los convierte en trabajo ejecutable trazable 1:1 a los IDs del informe. No se persigue certificación formal (SOC 2, ISO 27001, pentest externo, DPIA), pero sí se establecen invariantes que dejen al sistema en condiciones de superarlas si en el futuro se necesitan.

### What Makes This Special

Este no es un PRD de descubrimiento — es un PRD de **cierre y trazabilidad**. El trabajo creativo (identificar riesgo, priorizar, modelar amenazas, calcular CVSS) ya se hizo en el informe V2. Aquí cada FR apunta a uno o varios IDs concretos del V2 (AUTH-NNN, API-NNN, INJ-NNN, INFRA-NNN, WS-NNN, DATA-NNN), y cada NFR define un invariante verificable que el V3 deberá comprobar (p. ej. "ningún schema Mongo multi-tenant sin campo `companyId`", "JWT verificado con whitelist explícita de algoritmos", "cero secretos hardcoded en repositorio detectados por secret-scan").

El diferenciador frente a un hardening convencional es el **bias hacia enforcement automático** sobre revisión manual: siempre que sea posible, el fix se acompaña de un guard en CI, un lint rule, un test de aislamiento multi-tenant o un hook que impida la regresión. La meta no es solo cerrar los hallazgos actuales, sino dejar el sistema en un estado donde volver a introducirlos sea difícil por construcción.

### Core Insight

La seguridad en un SaaS multi-tenant con PII (GDPR) no es un feature que se añade al final; es un invariante que se enforza a nivel de schema, repositorio, gateway y pipeline CI. El informe V2 demostró que el proyecto tiene los patrones correctos (DDD, Result, Guards, CQRS) pero que la aplicación es inconsistente: el 67% de hallazgos V1 persistió en V2 porque el fix se hizo en un punto y se olvidó en otro equivalente. Este PRD asume esa lección y prioriza **fixes sistémicos con enforcement** sobre fixes puntuales.

## Project Classification

- **Project Type:** Backend API + WebSocket Server (NestJS v11, REST + Socket.IO, PostgreSQL + MongoDB)
- **Sub-type:** Security Hardening / Technical Debt Remediation (no feature development; zero regression tolerated en API/WS públicos)
- **Domain:** MarTech / Conversational SaaS B2B multi-tenant — captación de leads, chat en vivo visitor↔comercial, tracking de eventos, integración con CRMs externos (LeadCars, HubSpot-ready, Salesforce-ready)
- **Complexity:** Alta — multi-tenant con PII (nombre, email, teléfono, DNI, población), GDPR obligatorio, WebSocket real-time, auth stack complejo (JWT + Keycloak + API keys + Socket.IO handshake), criteria dinámico SQL, dos persistencias (PostgreSQL legacy + MongoDB V2), integración con CRMs externos
- **Project Context:** Brownfield — sistema en producción con auditoría interna previa (V1 abril 2026, V2 abril 2026), 166 hallazgos documentados, credenciales reales activas en `.env` pendientes de rotación (acción P0 inmediata)
- **Compliance scope:** GDPR (obligatorio, requisito de primer nivel), OWASP ASVS Nivel 2 (marco técnico de referencia recomendado)

## Success Criteria

### User Success (Developer / Maintainer)

El "usuario" de este PRD es el equipo de desarrollo (Amelia, Quinn, Roger). Tiene éxito cuando:

- **Regresión por omisión es difícil:** un desarrollador que añade un nuevo schema Mongo multi-tenant sin `companyId` ve fallar el CI antes del merge, no el pentest del año siguiente.
- **Los patrones seguros son el camino de menor resistencia:** cifrar con AEAD, proteger un endpoint con guard, o añadir una consulta con filtro de tenant es más fácil que hacerlo mal. Helpers y base classes existen para todo patrón repetido.
- **El contexto de cada hallazgo está a un clic:** cada historia del proyecto enlaza al ID del informe V2, al archivo:línea afectado y al test que valida el fix. Nadie tiene que "adivinar" por qué se hace un cambio.
- **El proyecto se completa en 2 sprints sin bloqueos ciegos:** cada historia es ejecutable de forma independiente, con AC testables y rollback definido.

### Business Success (Postura de Seguridad)

El "negocio" aquí es la postura de seguridad del sistema. Tiene éxito cuando:

- **Ningún secreto productivo vive en el repositorio ni se escribe a logs** (secret-scan en CI con 0 hallazgos; `eslint-plugin-no-secrets` activado).
- **Todo endpoint HTTP/WS público está protegido por defecto** (audit en CI que detecta controladores sin `@UseGuards` o con guards comentados).
- **Todos los schemas Mongo multi-tenant tienen `companyId` indexado y todo repositorio lo incluye en el filtro** (verificable con test automatizado que itera schemas y repos del contexto `conversations-v2`, `commercial`, `tracking-v2`).
- **El sistema puede resistir pruebas básicas de cross-tenant IDOR** (una batería de tests de integración intenta acceder a recursos de una empresa B con token de empresa A y todos fallan con 403/404).
- **La criptografía es moderna y autenticada** (AES-256-GCM para todo cifrado en reposo; JWT con whitelist explícita de algoritmos; `header.kid` leído del header, no del payload).

### Technical Success

Invariantes técnicos verificables en re-auditoría V3:

| Invariante                                                    | Verificable en V3 por                                   |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| 0 credenciales reales en `.env`, `scripts/`, `Dockerfile`     | `gitleaks` + `trufflehog` sobre HEAD                    |
| 0 logs de secretos o material criptográfico privado           | grep regex sobre logs + revisión `app.module.ts:300-315`|
| JWT sin `algorithms` whitelist = 0 ocurrencias                | Análisis estático sobre `jwt.verify` calls              |
| `kid` leído de `payload.*` = 0 ocurrencias                    | Análisis estático sobre `token-verify.service.ts`       |
| Controladores NestJS sin guard explícito en endpoints escritos | Lint rule custom + audit                               |
| Schemas Mongo multi-tenant sin `companyId` = 0                | Test de integración que inspecciona schemas             |
| Repositorios Mongo que ejecutan queries sin filtro tenant = 0 | Test de integración que stubbea model y verifica filter |
| AES-256-CBC en uso activo = 0 (sustituido por GCM)            | Grep sobre infra/services                               |
| `CriteriaConverter` concatena SQL sin whitelist de campos     | Test que valida rechazo de campos no registrados        |
| `child_process.exec` con input externo = 0                    | Análisis estático sobre llm/tool-executor               |
| Dockerfile corre como root / Node 18 = 0                      | Verificación de Dockerfile HEAD                         |
| GH Actions sin `permissions:` o con `sshpass -p`              | Verificación de `.github/workflows/*`                   |

### Measurable Outcomes

Métricas cuantitativas del proyecto:

- **Hallazgos P0 (CRÍTICOS) cerrados:** 40/40 al final del proyecto.
- **Hallazgos P1 (ALTOS) cerrados:** 60/60 al final del proyecto, con posibilidad de hasta 3 hallazgos aceptados con mitigación documentada firmada.
- **CVSS máximo en V3:** ≤ 3.9 (severidad MEDIA). Ningún hallazgo con CVSS ≥ 4.0.
- **Cobertura de tests de multi-tenant isolation:** ≥ 80% de repositorios V2 con al menos un test que valide filtrado por `companyId`.
- **Pipeline CI bloquea:** gitleaks, npm audit (sin Critical/High no-parcheables), lint rules de seguridad, tests de isolation, todos obligatorios para merge.
- **Velocidad de rotación de secretos:** procedimiento documentado y probado una vez en entorno de staging (tiempo de rotación de secret completo ≤ 4h).

## Product Scope

### MVP — Minimum Viable Hardening (Sprint 1, 2 semanas)

Alcance mínimo para que el sistema deje de tener CRÍTICOS activos. Debe completarse antes del siguiente deploy a producción.

- **Todas las 12 acciones P0 del informe V2 cerradas:**
  1. Rotar credenciales AWS/Resend/Groq expuestas en `.env` y mover a KMS/Vault.
  2. Eliminar logs de secretos en `app.module.ts:300-315` y claves RSA privadas en `auth-visitor-jwt.ts:69,71,101,103,144-163`.
  3. Cerrar endpoints públicos sin auth: `OpenSearchController`, `sync-keycloak`, `CommercialController`, `POST /auth/user/register` (roles body).
  4. Fix `header.kid` (no `payload.kid`) en `token-verify.service.ts:101-103`.
  5. Añadir `algorithms: ['RS256']` whitelist a todos los `jwt.verify`.
  6. Añadir `companyId` a schemas `ChatSchema`, `MessageSchema`, `CommercialSchema` (+ migraciones) y filtrarlo en todos los repos V2.
  7. Sustituir AES-256-CBC por AES-256-GCM en `encrypt-adapter.ts`.
  8. Cambiar generación de API key de `SHA256(domain)` a `crypto.randomBytes(32)`.
  9. Añadir `@UseGuards(RolesGuard)` donde `@RequiredRoles` es inerte (`ChatV2Controller`).
  10. Eliminar fallback de `JWT_SECRET` hardcoded en `main.ts:51`.
  11. Arreglar SSRF en `LlmConfigController.baseUrl` (whitelist de hosts).
  12. Prototype-pollution guard en `base64ToCursor` + `tool-executor` LLM.
- **CI de emergencia:** gitleaks + npm audit bloqueantes en pipeline.

### Growth — Hardening Estructural (Sprint 2, 2 semanas)

Alcance que cierra los ALTOS y añade enforcement automático para prevenir regresión.

- Resto de hallazgos P1 (60 ALTOS) de las 6 áreas del V2.
- Redis adapter para Socket.IO multi-réplica (WS-012).
- `CriteriaConverter` con whitelist de campos por aggregate y tests de rechazo.
- Keycloak configuración producción (`start --optimized`, `KC_HOSTNAME_STRICT:true`, TLS pinning).
- Dockerfile Node LTS actual, USER no-root, multi-stage sin `.env.*` en layers.
- GH Actions con `permissions:`, SHA pin, OIDC en lugar de `sshpass -p`.
- Lint rules custom + tests de isolation multi-tenant en CI.
- Rotación de secretos procedimentada y ensayada una vez.

### Vision — Fuera de Scope (backlog post-hardening)

Fuera del alcance de este PRD, documentado para referencia:

- Cierre de hallazgos MEDIA (47) y BAJA (19).
- Pentest externo profesional.
- Certificaciones formales (SOC 2 Type I/II, ISO 27001).
- DPIA formal GDPR (Data Protection Impact Assessment) y RoPA documentado.
- Migración completa contextos V1 (PostgreSQL legacy) → V2 (MongoDB) en `conversations` y `visitors`.
- Refactor de `CriteriaConverter` a un DSL con parsing seguro (PEG) en lugar de construcción de query con QueryBuilder.
- MFA para cuentas comerciales.
- Threat modeling formal (STRIDE) por contexto.

## Actors & Security Flows

Este PRD mapea, en lugar de user journeys narrativas de negocio, los **flujos de interacción con el sistema desde la perspectiva de seguridad**. Cada flujo tiene un estado "pre-hardening" (lo que el informe V2 evidenció) y un estado "post-hardening" (lo que debe ocurrir al cierre del proyecto).

### Actores

| Actor                              | Tipo                        | Descripción                                                                                          |
| ---------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------- |
| Developer (Amelia)                 | Interno legítimo            | Añade/modifica features; debe poder confiar en que los patrones seguros son el default y el CI le avisa de errores. |
| Atacante externo oportunista       | Adversario sin credenciales | Escanea Internet, encuentra endpoint abierto, explota.                                               |
| Atacante con cuenta de bajo privilegio | Adversario interno-adyacente | Comercial de empresa A intenta escalar privilegios o acceder a datos de empresa B.                   |
| Visitante anónimo malicioso        | Adversario sin cuenta       | Manipula `visitorId`/`tenantId` en handshake WS, spoofea tokens.                                    |
| Pipeline CI                        | Proceso automatizado        | Bloquea merges que introduzcan regresiones (secret-scan, lint rules, isolation tests).              |
| Auditor V3                         | Verificador                 | Re-ejecuta análisis estáticos/tests al final para validar el "done".                                |

### Flujo 1 — Developer añade nuevo repositorio Mongo multi-tenant

**Pre-hardening (V2 evidencia):** Amelia crea `MongoSavedFilterRepositoryImpl.findById(id)` sin filtro `companyId`. El código compila, los tests unitarios pasan, pasa code review porque el reviewer no tiene checklist explícito de multi-tenancy. Deploy a producción. Seis meses después, el V3 descubre un IDOR (DATA-014). 67% de hallazgos V1 persistieron en V2 por exactamente este patrón.

**Post-hardening:** Amelia crea el repositorio extendiendo `BaseTenantAwareRepository<T>` (helper). Si intenta llamar a `model.findOne()` directamente sin pasar por `findByIdWithinTenant()` del helper, un lint rule custom lo marca como error. Si el código llega al CI, un test de isolation automático itera los repos del contexto y verifica que toda query pública pase `companyId` como filtro. Merge bloqueado.

**Requirements revelados:** `BaseTenantAwareRepository` helper, ESLint rule custom `no-mongo-query-without-tenant`, test de integración por contexto V2 (`isolation.spec.ts`).

### Flujo 2 — Atacante externo escanea endpoints sin auth

**Pre-hardening (V2 evidencia):** El atacante ejecuta `nuclei` contra `api.guiders.com`. Encuentra:
- `POST /open-search/*` (API-001) — responde 200, ejecuta queries.
- `POST /auth/user/register` (API-008) — acepta `roles: ["SUPER_ADMIN"]` en el body; atacante se auto-asigna super-admin.
- `POST /sync-keycloak` (auth-user controller) — sin guard, fuerza sync.
- `GET /commercials/*` (API-004) — `@UseGuards` comentado; lista todos los comerciales de todas las empresas.
- `POST /llm/config` (API-009) — SSRF vía `baseUrl: http://169.254.169.254/...` (AWS metadata).

**Post-hardening:** Todos los endpoints escritos requieren `@UseGuards(AuthGuard, RolesGuard)` explícito. Un lint rule custom detecta controladores sin guard y falla el CI. `OpenSearchController` solo está registrado en entorno de tests (no en `AppModule` de prod). `/auth/user/register` ignora `roles` del body (los roles se asignan por admin autenticado en endpoint separado). `baseUrl` LLM valida contra whitelist de hosts permitidos y rechaza rangos RFC1918, link-local y metadata endpoints.

**Requirements revelados:** Guard-enforcement lint rule, refactor de register/sync-keycloak, URL-allowlist validator para LLM config, segregación de rutas tests vs prod.

### Flujo 3 — Comercial de empresa A intenta leer datos de empresa B

**Pre-hardening (V2 evidencia):** El comercial obtiene su JWT legítimo con `companyId: A`. Hace `GET /v2/chats?chatId=<UUID-de-empresa-B>` o abre socket con `chatId` que no le pertenece. El backend:
- `MongoChatRepositoryImpl.findById` no filtra por companyId (DATA-007).
- `ChatSchema` no tiene campo `companyId` (DATA-001).
- `MessageSchema` tampoco (DATA-002); un regex search cross-tenant devuelve mensajes de empresa B.
- `SavedFilter.findById` ignora owner (DATA-014).
- `Commercial.match()` ignora criteria companyId.

**Post-hardening:** Todos los schemas V2 multi-tenant tienen `companyId` indexado y obligatorio. Todos los repos V2 usan `BaseTenantAwareRepository.findByIdWithinTenant(id, ctx.companyId)`. El JWT contiene `companyId` y un `TenantContextInterceptor` inyecta `ctx.companyId` en todos los handlers. Un intento cross-tenant devuelve 404 (no 403, para no filtrar existencia). Tests de isolation prueban el escenario para cada aggregate V2.

**Requirements revelados:** Migración de schemas con `companyId`, `TenantContextInterceptor`, `BaseTenantAwareRepository`, tests de isolation por aggregate V2.

### Flujo 4 — Visitante anónimo abre WebSocket con handshake manipulado

**Pre-hardening (V2 evidencia):** El atacante abre socket sin token y envía `handshake.auth = { visitorId: '<uuid>', tenantId: '<empresa-víctima>' }` en claro (WS-002). El gateway acepta y lo une a la sala `visitor:<uuid>` de la empresa víctima. Luego envía `chatId: '<uuid>:commercial'` (WS-011, separator injection) y se une a la sala del comercial. Puede sniffear mensajes internos.

**Post-hardening:** El handshake requiere JWT firmado (visitante lleva un token corto emitido por backend tras crear sesión vía SDK). `tenantId` y `visitorId` se extraen del payload JWT, no del body. Los nombres de sala se construyen con helpers que validan/escapan separadores (`buildRoomName({type, id, companyId})`). Los handlers rechazan `chatId` con caracteres especiales. Sockets se suscriben a Redis adapter para consistencia multi-réplica (WS-012).

**Requirements revelados:** JWT-only handshake, room-name helper con validación, Redis WS adapter, tests de handshake con payloads hostiles.

### Flujo 5 — Pipeline CI bloquea PR con regresión

**Pre-hardening:** El pipeline ejecuta `npm test` y `npm run lint`. No tiene secret-scan, no tests de isolation, no lint rules de seguridad. Un PR que introduce `bcrypt.hash(password, 4)` o un schema sin companyId pasa limpio.

**Post-hardening:** El pipeline ejecuta en este orden:
1. `gitleaks detect` — bloquea si hay secretos.
2. `npm audit --audit-level=high` — bloquea si hay high/critical sin parche.
3. `npm run lint` con reglas custom (`no-mongo-query-without-tenant`, `require-guards-on-controllers`, `no-hardcoded-crypto-key`).
4. `npm run test:isolation` — tests de multi-tenancy.
5. `npm run test:unit` + `npm run test:int`.
6. SBOM generation (CycloneDX) archivado como artifact.

Cualquier fallo bloquea el merge. El PR que intenta introducir un patrón roto falla en el lint, nunca llega a review.

**Requirements revelados:** Gitleaks job, custom ESLint plugin, tests de isolation, SBOM en pipeline, branch protection actualizada en GitHub.

### Flujo 6 — Auditor V3 verifica cierre al final del proyecto

**Post-hardening:** Al final del sprint 2, el auditor re-ejecuta los 6 análisis del V2 con la misma metodología. Verifica contra la tabla de invariantes técnicos (Success Criteria § Technical Success). Cada hallazgo P0/P1 del V2 se marca como:
- **Resuelto** (fix en código + test que lo valida), o
- **Aceptado con mitigación** (risk acceptance firmada, máx 3 ALTOS).

Output: `docs/SECURITY_AUDIT_2026_V3.md` con ≤ 3 ALTOS y 0 CRÍTICOS. Si la condición no se cumple, el proyecto no está cerrado.

**Requirements revelados:** Procedimiento de re-auditoría documentado, plantilla de risk acceptance, tabla de trazabilidad V2→V3 por ID.

### Journey Requirements Summary

Los flujos anteriores revelan las siguientes capacidades que deben construirse o añadirse al sistema:

| Capacidad                                            | Flujos que la requieren | Área V2           |
| ---------------------------------------------------- | ----------------------- | ----------------- |
| BaseTenantAwareRepository + TenantContextInterceptor | 1, 3                    | DATA              |
| ESLint plugin custom seguridad                       | 1, 2, 5                 | Transversal       |
| Tests de isolation multi-tenant                      | 1, 3, 5                 | DATA              |
| Guard-enforcement lint + refactor controllers        | 2                       | API, AUTH         |
| URL-allowlist validator (SSRF)                       | 2                       | API (LLM)         |
| Migración schemas V2 con companyId                   | 3                       | DATA              |
| JWT-only WebSocket handshake                         | 4                       | WS, AUTH          |
| WS room-name helper + separator validation           | 4                       | WS                |
| Redis adapter Socket.IO                              | 4                       | WS, INFRA         |
| CI pipeline: gitleaks + SBOM + isolation             | 5                       | INFRA (DevSecOps) |
| Secret rotation procedure (AWS/Resend/Groq → KMS)    | 2 (P0 inmediato)        | INFRA             |
| AES-256-GCM migration + API-key regeneration         | 2, 3                    | AUTH              |
| Re-auditoría V3 procedure + risk acceptance tmpl     | 6                       | Transversal       |

## Domain-Specific Requirements

### Compliance & Regulatory

**GDPR (obligatorio — ley de aplicación directa para tratar datos de ciudadanos UE):**

- **Art. 32 (seguridad del tratamiento):** El cifrado en reposo y en tránsito es el estándar legal mínimo. El uso actual de AES-256-CBC sin MAC (`encrypt-adapter.ts`) no cumple con "state of the art" exigido por el artículo. Obligatorio migrar a AEAD (AES-256-GCM o ChaCha20-Poly1305).
- **Art. 5.1.f (integridad y confidencialidad):** Un acceso cross-tenant no autorizado es una **brecha de confidencialidad notificable a la AEPD en ≤ 72h** (Art. 33) y a los titulares si hay "alto riesgo" (Art. 34). Multi-tenant isolation es por tanto requisito de compliance, no solo de arquitectura — los 21 hallazgos DATA del V2 representan riesgo regulatorio activo.
- **Art. 17 (derecho al olvido):** El sistema debe soportar borrado completo de un `visitorId` en todos los contextos V2 (chats, messages, tracking events, leads) en plazo razonable (≤ 30 días). El procedimiento debe estar documentado y ser ejecutable vía CLI o endpoint administrativo autenticado. Actualmente no existe.
- **Art. 30 (RoPA — registro de actividades de tratamiento):** Fuera de scope elaborarlo, pero el sistema debe **permitir generarlo**: logging estructurado de qué actor (`userId`, `commercialId`, `systemProcessId`) accedió a qué recurso (`visitorId`, `chatId`) y con qué base legal. Añadir `AuditLogInterceptor` en endpoints que tocan PII.
- **Art. 6 (base legal):** El `consent` context existe pero no registra la base legal invocada. Añadir campo `legalBasis: 'consent' | 'legitimate_interest' | 'contract'` al registro de consentimiento para trazabilidad.
- **Scope PII:** email, teléfono, nombre completo, DNI (formularios automoción), IP, fingerprint, contenido de mensajes de chat (pueden contener cualquier dato personal). Todo logging de estos campos está prohibido salvo hash irreversible.

**OWASP ASVS Nivel 2 (marco técnico de referencia):**

El proyecto adopta ASVS L2 como checklist de verificación. Los controles relevantes activados por los hallazgos V2:

| Control ASVS L2         | Hallazgo V2 relacionado                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| V2 Authentication       | AUTH-001 (JWT algorithms), AUTH-002 (kid bug)                                                             |
| V3 Session              | WS-002 (handshake sin token), WS-011 (room hijack)                                                        |
| V4 Access Control       | API-004 (guards comentados), API-008 (role escalation), DATA-001..014 (IDOR)                              |
| V5 Input Validation     | API-009 (SSRF LLM), WS-011 (separator injection), INJ-003 (SQL injection en CriteriaConverter)            |
| V6 Cryptography         | AUTH-003 (AES-CBC sin MAC), AUTH-005 (API key = hash determinista)                                        |
| V7 Logging & Monitoring | INFRA-001 (logs de secretos), INFRA-002 (logs de RSA privada)                                             |
| V8 Data Protection      | DATA-001..021 (multi-tenant isolation)                                                                    |
| V10 Malicious Code      | INJ-004 (child_process.exec en LLM), supply-chain                                                         |
| V14 Configuration       | INFRA-007 (Keycloak hostname strict), Dockerfile, GH Actions                                              |

### Technical Constraints

- **Cifrado en reposo obligatorio** con AEAD autenticado (AES-256-GCM). Ningún campo que contenga PII, API keys, OAuth refresh tokens o material criptográfico se persiste en claro.
- **TLS 1.2+ obligatorio** en tránsito: cliente↔backend, backend↔Mongo, backend↔Postgres, backend↔Keycloak, backend↔Groq/Resend/AWS. Mongo y Postgres con `tls=true` en connection string.
- **Isolation multi-tenant enforced en 3 capas defensivas:**
  1. **Schema layer:** todo documento V2 multi-tenant tiene campo `companyId` indexado y obligatorio.
  2. **Repository layer:** `BaseTenantAwareRepository` impide queries sin filtro de tenant (lint + runtime check).
  3. **Test layer:** cada aggregate V2 tiene `isolation.spec.ts` que intenta cross-tenant y espera 404.
- **JWT sin secretos en logs:** Pino redactors configurados para eliminar `Authorization`, `authorization`, `token`, `password`, `apiKey`, `secretKey`, `refreshToken`, `privateKey` antes de escribir.
- **Rate limiting obligatorio** en endpoints de auth (`/auth/login`, `/auth/user/register`, handshake WS). NestJS throttler configurado: 5 req/min para login, 20 req/min handshake.
- **Password hashing:** Argon2id (o bcrypt cost≥12 como fallback). Verificar que `auth-user` no usa hash débil.
- **Headers de seguridad:** `helmet` ya presente; auditar que incluye CSP restrictivo, HSTS con `preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **CORS allowlist explícito** (no wildcard). `main.ts:105` debe cargar lista desde env, no hardcoded.

### Integration Requirements

- **Keycloak (prod):** `start --optimized`, `KC_HOSTNAME_STRICT:true`, `KC_HOSTNAME_STRICT_HTTPS:true`, TLS pinning en backend verifier, `kid` extraído **siempre** de `header.kid` (nunca `payload.kid`).
- **AWS S3:** credenciales vía IAM role (EC2/ECS) o AWS Secrets Manager / KMS. Prohibido `.env` con `AWS_ACCESS_KEY_ID` en claro. Rotación automática cada 90 días.
- **Resend (email transaccional):** API key en KMS/Vault. Dominio DKIM+SPF+DMARC verificado.
- **Groq (LLM):** API key en KMS. Input sanitizado antes de enviar al modelo. `tool-executor` con whitelist estricta de tools; eliminación de `child_process.exec` con input externo (refactor a tools declarativas parseadas, no shell).
- **MongoDB:** TLS obligatorio, usuario con principio de mínimo privilegio (no `root`/`admin`), credenciales rotadas. `scripts/mongo-init.js` no usa passwords default.
- **PostgreSQL:** TLS, connection pooler con credenciales rotadas, RBAC por aplicación.
- **Socket.IO:** Redis adapter para consistencia multi-réplica, emisión de salas con validación de nombre.
- **CRM externos (Zoho/HubSpot):** fuera de scope del PRD, pero el export de PII debe quedar auditado (RoPA-ready).

### Risk Mitigations

| Riesgo                                                 | Mitigación                                                                                                                                    | FR relacionado     |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Fuga de credenciales de terceros vía `.env` committed  | Rotación + KMS/Vault + `gitleaks` bloqueante en CI + `.env` fuera de imagen Docker.                                                           | FR-INFRA-SECRETS   |
| Cross-tenant data leak (GDPR art. 5.1.f, notificable)  | 3 capas defensivas (schema, repo base class, isolation tests) + lint rule.                                                                    | FR-DATA-ISOLATION  |
| Token forgery por `header.kid` vs `payload.kid`        | Fix en `token-verify.service.ts` + JWT algorithms whitelist + test regression.                                                                | FR-AUTH-JWT        |
| Prompt injection + RCE vía LLM tool-executor           | Whitelist tools declarativas, prohibición `child_process.exec` con input externo, timeout agresivo.                                           | FR-LLM-SANDBOX     |
| SSRF desde `LlmConfig.baseUrl`                         | URL-allowlist validator (hosts + puertos), rechazo RFC1918 / link-local / metadata endpoints.                                                 | FR-API-SSRF        |
| Logs con PII o secretos                                | Pino redactors + eliminar logs de `JWT_PRIVATE_KEY` y `JWT_SECRET` en `app.module.ts:300-315` y `auth-visitor-jwt.ts:69,71,101,103,144-163`. | FR-INFRA-LOG       |
| CBC sin MAC = padding oracle / tampering silencioso    | Migración a AES-256-GCM + migration script de datos cifrados existentes + rotación de keys.                                                   | FR-AUTH-CRYPTO     |
| API keys predecibles (`SHA256(domain)`)                | `crypto.randomBytes(32)` + regeneración masiva + notificación a clientes + invalidación de keys antiguas.                                     | FR-AUTH-APIKEY     |
| Regresión de hallazgos V1→V2 (67% persistencia)        | Enforcement automático en CI: lint rules custom + isolation tests + secret-scan bloqueantes antes de merge.                                   | FR-DEVSEC-PIPELINE |
| Derecho al olvido GDPR no ejecutable                   | Comando CLI `forget-visitor --visitorId <uuid>` que borra en todos los contextos V2 + audit log del borrado.                                  | FR-GDPR-ERASURE    |
| Keycloak configurado en modo dev en prod               | Checklist de despliegue + `KC_HOSTNAME_STRICT:true` obligatorio + test de smoke en staging.                                                   | FR-INFRA-KEYCLOAK  |

## Innovation & Novel Patterns

Este proyecto aplica prácticas de seguridad establecidas (OWASP ASVS L2, AEAD, gitleaks, SBOM) que no son innovadoras per se. Sin embargo, hay **una** decisión de diseño que no corresponde a un patrón empaquetado maduro en el stack concreto (NestJS + Mongoose + DDD/CQRS multi-tenant shared-database) y que merece capturarse explícitamente para que el equipo entienda qué está eligiendo y qué está rechazando.

### Enforcement multi-capa de multi-tenant isolation

El patrón industrial típico para multi-tenant isolation usa uno de:

- **Database per tenant** — aislamiento duro, coste operativo alto, no aplicable porque Guiders comparte DB entre tenants por diseño de producto.
- **PostgreSQL Row-Level Security** — no aplicable; los contextos V2 usan Mongo.
- **ORM tenant discriminator maduro** — existe en Ruby (`acts_as_tenant`), Hibernate (multi-tenancy strategy), Django; no existe equivalente maduro para NestJS + Mongoose + aggregates DDD en 2026.
- **Code review con checklist manual** — lo que había; falló con 67% persistencia V1→V2.

Este PRD propone (y el Architecture step de Winston detallará) un patrón de **3 capas defensivas con enforcement automático anti-rodeo**:

| Capa           | Mecanismo                                                                           | Cómo se rompe el rodeo                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Schema**     | Todo documento V2 multi-tenant tiene `companyId` indexado obligatorio.              | Migración añade documento sin `companyId` → isolation tests fallan CI.                                                            |
| **Repository** | `BaseTenantAwareRepository` con método único `findByIdWithinTenant(id, companyId)`. | Dev llama a `model.findOne` directo → ESLint rule `no-mongo-query-without-tenant` falla CI.                                       |
| **Test**       | `isolation.spec.ts` por aggregate V2 intenta cross-tenant, espera 404.              | Dev añade aggregate sin test → cobertura gate falla CI; `.skip` prohibido en archivos `*isolation*.spec.ts` por regex en pipeline. |

**Por qué este diseño y no solo "añadir un helper":**

- El V2 mostró que añadir un patrón no basta si el patrón es rodeable. El 67% de persistencia V1→V2 incluía casos donde el fix se aplicó a un aggregate pero no se replicó a los siguientes.
- El lint rule custom vive en el repo (`eslint-plugin-guiders-security`), no en config externa. No se desactiva con `// eslint-disable` inadvertido — requiere justificación explícita en commit message matcheada por pre-commit hook.
- Los isolation tests no se saltan con `.skip` en CI (regex en pipeline detecta `describe.skip` / `it.skip` en `*isolation*.spec.ts` y falla build).
- El diseño elimina la dependencia de disciplina individual. Un dev nuevo que no conozca el patrón no puede romperlo sin que el CI lo vea.

**Riesgo asumido:** crear un patrón interno es deuda técnica a futuro — si aparece framework maduro para NestJS+Mongoose multi-tenant con enforcement, habrá que migrar. Coste aceptado; revisar el mercado anualmente.

## Project Type & System Architecture Context

**Clasificación técnica:** Backend API REST + WebSocket server (NestJS v11, Express, Socket.IO), arquitectura DDD+CQRS con doble persistencia (PostgreSQL legacy V1 + MongoDB V2), multi-tenant por `companyId`, consumido por tres clientes oficiales (SDK pixel visitante, dashboard comercial, plugin WordPress) y dos integraciones salientes (Keycloak OIDC, CRM LeadCars HTTP).

### Modelo de Autorización

Cuatro tipos de identidad, cada uno con su propio ciclo de vida de credencial:

| Identidad | Credencial | Emisor | Duración | Refresh | Revocación |
|---|---|---|---|---|---|
| Usuario (comercial/admin) | JWT firmado por Keycloak (HS256/RS256) | Keycloak | 15 min access + 8 h refresh | Rotación en cada uso | Blacklist + logout all sessions |
| Visitante (anónimo/identificado) | JWT firmado por backend (RS256) | `/pixel/token` | 1 h access + 24 h refresh | Rotación | TTL natural + revocación por `companyId` |
| Servicio (plugin WordPress) | API Key (hash SHA-256 + salt) | `/api-keys/create` | Sin expiración por defecto (warning a 90 d) | Rotación manual con ventana de gracia 30 d | Revocación inmediata |
| BFF (OAuth flow) | Cookie HttpOnly + SameSite=Strict | `/bff/auth/callback/:app` | 1 h | Via `/bff/auth/refresh` | Logout |

**Autorización:** `RolesGuard` con roles `admin` y `commercial` mapeados desde claim `realm_access.roles` del JWT (fix AUTH-019 del informe V2 — hoy el mapeo es frágil y hay endpoints sin `@Roles()`).

### Matriz endpoint→control

El inventario completo (25 controllers HTTP, 140+ endpoints, 13 eventos WebSocket) vive en `security-contracts/endpoint-protections.yaml` como artefacto **machine-readable y versionado**. Ese archivo es la fuente de verdad para:

1. **Auditoría:** qué controles debe declarar cada endpoint.
2. **CI (FR-CI-003):** test de integración `test/security/endpoint-protections.spec.ts` lee el YAML y valida que cada controller declare los decoradores esperados (`@UseGuards`, `@Roles`, `@RequireTenantContext`, etc.). Un endpoint añadido sin actualizar el YAML falla CI.
3. **Lint rule custom (FR-CI-002):** `eslint-plugin-guiders-security/require-tenant-context-decorator` exige que todo controller autenticado declare uno de los tres decoradores de contexto tenant.

**Resumen por grupo** (detalle en YAML):

- **Grupos auth (none/JWT user/JWT visitor/API key/cookie BFF/OAuth):** cada endpoint tiene su grupo explícito. Rate limit por defecto `standard` (100 req/min), excepciones documentadas: `progressive_auth` (1s/5s/30s backoff exponencial) en `/login`, `/register`, `/pixel/token`, `/refresh`; `strict` (20 req/min) en operaciones admin y SSRF-target (`/leads/admin/test-connection`); `generous` (1000 req/min) en pixel tracking y eventos WS de typing.
- **Contexto tenant:** 23 de 25 controllers requieren `@RequireTenantContext`. Excepciones explícitas: JWKS público, health checks, flujo OAuth callback, endpoints de auth pre-login.
- **Endpoints que deben desactivarse en producción** (`must_disable_in_production: true` en YAML): `/open-search/*` (debug tool), evento WS `test`.

### Contrato operacional de Multi-Tenancy

Tres decoradores obligatorios sobre cada controller autenticado (propuesta Winston — party mode):

```ts
@RequireTenantContext()   // Extrae companyId del JWT y lo inyecta en todo repo llamado desde este controller
@OptionalTenantContext()  // Acepta llamadas con o sin tenant (p.ej. "listar sites propios")
@NoTenantContext()        // Explícitamente sin tenant (auth flows, health, JWKS)
```

Un controller que no declare uno de los tres **falla el build** vía lint rule custom. Esto cierra el rodeo del "olvido de filtrar por companyId" que produjo el 67% de regresión V1→V2 documentada en DATA-001…DATA-021.

### Rate Limiting — Infraestructura compartida con WS

El rate limiter usa **Redis como store compartido** (propuesta Winston — party mode). Razón: el WebSocket gateway ya requiere Redis adapter por FR-WS-001 (hoy usa in-memory, rompe con múltiples instancias). En lugar de añadir una segunda infra, ambos subsistemas comparten la misma instancia Redis (con namespaces distintos). El rate limiter in-memory actual es inútil en producción con más de una réplica Node y debe retirarse.

**Backoff exponencial** (propuesta Sally — party mode) en endpoints de auth: tras 3 intentos fallidos desde una misma IP+user tuple, el 4º requiere esperar 1 s, el 5º 5 s, el 6º 30 s, y a partir del 7º bloqueo de 15 min. Mejora UX del usuario legítimo que teclea mal el password (flat 5/min bloquea durante 1 min completo al 6º intento legítimo) y endurece contra credential stuffing distribuido (el atacante desde una IP agota rápido el backoff).

### Versionado y SDK Impact

- Los endpoints en `/v2/*` son el paraíso activo; `/v1/*` y `/visitor` (v1 sin prefijo) son **legacy en mantenimiento**. Los fixes de hardening se aplican a ambos, pero feature work solo va a v2.
- **Compatibilidad con SDK pixel:** los clientes oficiales (plugin WP, SDK JS embebido en webs cliente) consumen `/pixel/*`, `/tracking-v2/events`, `/v2/chats/visitor/:visitorId` y eventos WebSocket. Cambios que rompan contrato requieren:
  - Versión del SDK bumped (semver major).
  - Campo `x-sdk-version` en request headers, con ventana de compatibilidad mínima 90 días.
  - Banner de deprecación servido por el propio backend en response headers (`Deprecation`, `Sunset` RFC 8594).
- **Plugin WordPress — rotación API key:** cuando una API key entra en ventana de rotación (últimos 30 días antes de expirar) o tras revocación manual, el backend marca el estado en `GET /api-keys/status` (nuevo endpoint, FR-API-012). *El UX del banner de rotación en el plugin WP queda fuera del scope de este PRD* — se trackea como item de producto en Sprint 3.

### Consideraciones de Implementación

- **Guards orden crítico:** `AuthGuard` → `RolesGuard` → `TenantContextGuard` → controller. Invertirlo rompe el fail-closed (un endpoint sin `@Roles()` actual pasa porque `RolesGuard` no exige nada — hay que invertir default: sin `@Roles()` el guard rechaza, y marcar `@Public()` o `@NoAuth()` para excepciones explícitas).
- **Runbook AES-CBC→AES-GCM** (propuesta Quinn — party mode, CRIT-005): migración de cifrado de API keys no puede ser destructiva. Runbook obligatorio:
  1. Dry-run en staging con dataset anonimizado (reproducción del volumen de prod).
  2. Backup completo de colección `api_keys` antes del cutover.
  3. Migración dual-write: nuevas keys se escriben AES-GCM, lectura acepta ambos formatos durante ventana de 30 días.
  4. Rollback plan: si fallos >0.1% en primer día, revertir env flag `API_KEY_CIPHER=aes-cbc`, dual-read se mantiene.
  5. Cutover: tras 30 días, deshabilitar lectura AES-CBC, re-encriptar keys legacy pendientes manualmente.
- **Time-travel tests** (propuesta Quinn — party mode): Jest con `jest.useFakeTimers()` + `jest.setSystemTime()` para validar grace windows (30 días de API key, 24 h de refresh token, ventanas de WS handshake). Sin esto, los bugs temporales se escapan hasta producción. Obligatorio para FR-AUTH-* con lógica de expiración.

### Impacto sobre FRs

Este step informa directamente:

- **FR-AUTH** (modelo de identidades, backoff progresivo, runbook AES-GCM).
- **FR-API** (matriz endpoint→control vía YAML, endpoint `GET /api-keys/status`).
- **FR-WS** (Redis adapter compartido con rate limiter).
- **FR-MULTITENANT** (3 decoradores + lint rule).
- **FR-CI** (test driven by YAML, lint rules custom, time-travel tests).

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Tipo de MVP:** Problem-Solving MVP (remediación de deuda técnica de seguridad). No es Experience, Platform ni Revenue MVP. El "usuario" aquí es un auditor ejecutando la re-auditoría V3; el "producto validado" es un informe con 0 CRÍTICOS y 0 ALTOS. El éxito no es UX ni GMV: es la ausencia verificable de vulnerabilidades P0 y P1.

**Resource Requirements:**

- Equipo base: 2 devs (Amelia implementa, Quinn tests/enforcement) + Roger (PM/review/ownership) durante 2 sprints de 2 semanas.
- Infra extra obligatoria: instancia Redis compartida; staging con dataset anonimizado para dry-run de migraciones destructivas (AES-GCM, schema changes con backfill).
- **Testing budget explícito:** 40% del effort de cada sprint (~4 días de los 10 laborables) va a tests, no 10-15%. Sin este presupuesto, Quinn se convierte en cuello de botella invisible y los fixes se mergean sin cobertura de regresión. Esta línea es no-negociable tras la lección del V2 (67% regresión).

### MVP Feature Set (Sprint 1 — 2 semanas)

**Objetivo:** cerrar los P0 CRÍTICOS de mayor impacto con tests de regresión sólidos. Velocidad primera vez desconocida, así que commit conservador.

**Committed (8 items) — debe entregarse para declarar Sprint 1 verde:**

| # | FR tag | Hallazgo V2 | Qué entrega | Tests mínimos |
|---|---|---|---|---|
| 1 | FR-OBS-001 | CRIT-001 | Logger sanitizer + borrado de `console.log` con secretos | unit sanitizer + integration (inyectar secret, verificar log redactado) + regression del caso V2 |
| 2 | FR-AUTH-001 | CRIT-002 | Endpoints `/auth/*` con `@Public()` explícito; default fail-closed | integration por endpoint público + test que endpoint sin `@Public()` devuelve 401 |
| 3 | FR-AUTH-002 | CRIT-003 | Fix `header.kid` desde JWT header, no payload | unit: JWT con kid en payload es rechazado + regression |
| 4 | FR-AUTH-003 | CRIT-004 | Whitelist algorithms (`RS256`, `HS256`), rechazo `none` y `alg` mismatch | unit: JWT con `alg: none` rechazado + `alg` confusion test |
| 5 | FR-DATA-001 | CRIT-005 (parcial) | `companyId` en schemas Mongo (chat, message, commercial, tracking event) + índice compuesto + backfill script | 4 colecciones × (unit schema + integration cross-tenant + backfill dry-run test) = ~16 tests |
| 6 | FR-AUTHZ-001 | CRIT-008 | `RolesGuard` default fail-closed; controllers sin `@Roles()` rechazan | integration por endpoint protegido (~25 endpoints autenticados) |
| 7 | FR-INJ-001 | CRIT-009 | `CriteriaConverter` whitelist de campos + parametrización | SQL injection payload suite (OWASP) + whitelist coverage |
| 8 | FR-DATA-002 | CRIT-012 | Fix `findById` cross-partition en tracking-v2 repo | integration cross-tenant + regression |

**Estimación realista de tests Sprint 1: ~60-80 tests nuevos** (no 12). Presupuesto 40% del sprint absorbe esto.

**Stretch goals (4 items) — entran si el committed se cierra al día 8:**

| # | FR tag | Hallazgo V2 | Qué entrega |
|---|---|---|---|
| 9 | FR-API-001 | CRIT-007 | API key = random 256-bit, no `hash(domain)` |
| 10 | FR-INJ-002 | CRIT-010 | Fix SSRF en `/leads/admin/test-connection` (URL allowlist + DNS rebind protection) |
| 11 | FR-INJ-003 | CRIT-011 | Prototype pollution guard en body parsers |
| 12 | FR-AUTH-004 | CRIT-006 | (MOVIDO a Sprint 2 — ver nota abajo) |

**Nota CRIT-006 (AES-CBC → AES-GCM):** movido de Sprint 1 a Sprint 2. El item no es solo código: es código + migración dual-write/dual-read + ventana operativa 30 días + backup + runbook + rollback. Realista 3-5 días de dev senior + 30 días de ventana antes del cutover. Entregarlo "cerrado" en 2 semanas es imposible; meterlo en Sprint 1 sin ventana genera riesgo de corrupción de API keys en prod. Sprint 1 marca AES-CBC con flag `API_KEY_CIPHER=aes-cbc` deprecated + warning en logs; Sprint 2 ejecuta la migración completa.

**Definición de "Sprint 1 verde":** 8 committed cerrados en main + tests de regresión en CI + `gitleaks` + `trufflehog` pasando + retrospectiva cerrada (ver Ceremonias).

### Growth Feature Set (Sprint 2 — 2 semanas)

**Objetivo:** los 60 ALTOS + AES-GCM runbook + enforcement CI. El enforcement es la diferencia entre "V3 verde" y "V4 otra vez rojo" — sin él, 67% de regresión garantizada (lección V1→V2).

**Paquetes:**

1. **AES-GCM migration (CRIT-006 postpuesto) — 5 días:**
   - Día 1-2: implementación dual-write + dual-read + feature flag.
   - Día 3: dry-run staging con dataset anonimizado.
   - Día 4: cutover producción (dual-write activo, dual-read 30 días).
   - Día 5: monitorización + runbook documentado.
   - Cierre real: día 35 (cutover completo tras ventana 30 días).

2. **Enforcement CI (prioridad 1 — sin esto el Sprint 1 regresiona) — 4 días:**
   - `gitleaks` + `trufflehog` en pre-commit y CI (ya en Sprint 1 parcialmente).
   - Lint rule `eslint-plugin-guiders-security/require-tenant-context-decorator`.
   - Test `endpoint-protections.spec.ts` driven by YAML — **presupuestado 25% del Sprint 2 (~3 días)** solo por el harness NestJS metadata + aserciones sobre 25 controllers.
   - Regex en CI que falla build si hay `.skip` en `*isolation*` / `*security*` tests.
   - Coverage gate ≥90% branches en archivos `*isolation*`.
   - Mutation testing semanal (cadence, no per-commit) sobre módulos de auth y multi-tenant.

3. **TimeProvider refactor + time-travel tests — 2 días:**
   - Aislar lógica de expiración (JWT, API keys, WS handshake) en `TimeProvider` inyectable.
   - `jest.useFakeTimers()` no funciona out-of-the-box con Mongoose middleware + CQRS async, por eso la refactor es prerrequisito.

4. **Auth hardening ALTOS (15 items):** backoff progresivo (FR-AUTH-005), blacklist JWT revocados, rotación API keys con ventana de gracia, validación `aud`/`iss`, etc.

5. **API hardening ALTOS (18 items):** DTO validation estricta, rate limiters per-endpoint desde YAML, endpoint `GET /api-keys/status`, etc.

6. **Infra ALTOS (12 items):** Dockerfile LTS + non-root, GH Actions con `permissions: {}` mínimos + OIDC en lugar de long-lived secrets, Keycloak modo prod (no dev), Redis adapter para WS (ver SPOF abajo).

7. **Multi-tenant ALTOS (10 items):** repo helpers con `companyId` obligatorio, isolation tests en cada repo V2, 3 decoradores de tenant context aplicados a los 25 controllers.

8. **WS ALTOS (5 items):** Redis adapter, handshake throttle, separator injection guards.

### Vision (Sprint 3+ — fuera de scope)

Migración V1→V2 completa, banner UX rotación API key en plugin WP, endpoint `GET /sessions/state`, MFA (TOTP/WebAuthn), pentest externo anual, SOC 2 / ISO 27001, MEDIOS del informe V2.

### Nice-to-Have descartes (con rationale)

| Item | Por qué se descarta ahora | Cuándo sí entraría |
|---|---|---|
| MFA (TOTP/WebAuthn) | No hay hallazgo V2 que lo exija; Keycloak ya lo soporta como feature futura; 80% del riesgo de credential stuffing se mitiga con backoff + rate limit | Post-V3 si el informe lo pide, o requerimiento comercial enterprise |
| MEDIOS (6 items V2) | Riesgo residual aceptable; coste ~1 sprint; objetivo "0 CRÍTICOS + 0 ALTOS" no los necesita | Sprint 3 como mantenimiento continuo |
| Pentest externo | 15-30k€ + 4-6 semanas; no aporta hasta que V3 esté limpio (pentest sobre código con CRÍTICOS conocidos es dinero tirado) | Tras V3 verde |
| SOC 2 / ISO 27001 | Scope masivo (policy + compliance + proceso), 6-12 meses, auditor externo; no es un FR, es un programa | Si aparece cliente enterprise que lo exija contractualmente |
| DPIA formal | GDPR art. 35 exige para high-risk processing; caso limítrofe; audit trail art. 30 (FR-GDPR-001) cubre lo operativo | Si se añade scoring IA sobre PII (roadmap LLM) |
| Threat modeling STRIDE completo | ~2 semanas workshop + mantenimiento; ROI mayor tras V3 cuando el código ya no sea el problema | Post-V3 como ejercicio de madurez |
| Migración V1→V2 completa | 4-6 semanas; no es remediación de seguridad, es refactor | Roadmap de producto, no security PRD |

### Risk Mitigation Strategy

**Riesgos técnicos:**

- *Riesgo:* runbook AES-GCM corrompe API keys en prod.
  *Mitigación:* dry-run staging con dataset anonimizado (reproduce volumen prod); dual-write/dual-read 30 días; feature flag rollback (`API_KEY_CIPHER=aes-cbc`); backup completo antes cutover; canary 5%→25%→100% con métrica de decrypt failures.

- *Riesgo:* **Redis introduce nuevo SPOF al servicio** (rate limiter + WS adapter dependen de él).
  *Disyuntiva explícita:* o se despliega Redis en HA (Sentinel o Cluster, coste real de infra + ops) o se acepta formalmente que "Redis down = API degradada":
  - Rate limiter cae a modo fail-open (permite requests, expone a DoS).
  - WS adapter cae a in-memory (rompe multi-réplica — visitantes en réplica A no reciben mensajes de comerciales en réplica B).
  - Esta aceptación debe documentarse como risk acceptance (`security-contracts/risk-accepted/redis-spof.md`) firmada por Roger con revisión 90 días. No se puede tratar el Redis compartido como "gratis" — es la primera dependencia externa obligatoria del runtime.

- *Riesgo:* P0 #5 (companyId en schemas) y #6 (RolesGuard fail-closed) tienen dependencias de archivos compartidos y rompen endpoints hoy permisivos.
  *Mitigación:* ejecutar en este orden: #6 primero con feature flag `STRICT_ROLES=false` → `true` tras staging 48h; luego #5 con backfill script idempotente y rollback plan.

- *Riesgo:* lint rules custom rompen build de features no relacionadas.
  *Mitigación:* warnings durante 1 semana antes de errors; override explícito con justificación en commit message matcheada por pre-commit hook.

- *Riesgo:* time-travel tests con `jest.useFakeTimers()` rompen contra Mongoose middleware + CQRS async.
  *Mitigación:* refactor previo `TimeProvider` inyectable (presupuestado 2 días en Sprint 2). Sin refactor, los tests son flaky y se desactivan — peor escenario.

**Riesgos de producto:**

- *Riesgo:* plugin WP rompe por cambio en contrato API key.
  *Mitigación:* ventana de gracia 30 días; response headers `Deprecation` / `Sunset` (RFC 8594); SDK bumped con compatibilidad backwards mínima 90 días; `GET /api-keys/status` para que plugin detecte estado.

- *Riesgo:* dashboards comerciales rompen por `RolesGuard` fail-closed.
  *Mitigación:* audit de endpoints consumidos antes del cutover; staging con dashboard conectado 1 semana antes; lista de endpoints que dashboard usa debe estar en `security-contracts/endpoint-protections.yaml` con asignación de rol correcta.

**Riesgos de recursos:**

- *Riesgo:* Quinn no disponible para Sprint 2.
  *Mitigación realista:*
  - Amelia asume tests de regresión del código (ya los hace en Sprint 1 del committed).
  - **Enforcement CI se posterga a Sprint 3, no se delega a Roger** (Roger es PM, no tiene contexto de tests). El plan original de "delegar a Roger" era irreal.
  - Sprint 2 reducido: fixes de código de los 60 ALTOS + AES-GCM + retro; sin enforcement CI, sin YAML-driven test, sin mutation testing.
  - Risk acceptance obligatoria: "Sprint 2 sin enforcement significa que Sprint 3 **debe** ejecutarse para alcanzar 0 regresiones sostenible".

- *Riesgo:* aparecen >3 P1 tercos que no cierran en Sprint 2.
  *Mitigación:* **hasta 3 P1 aceptables** con mitigación firmada. Proceso formal:
  - Archivo: `security-contracts/risk-accepted/<finding-id>.md` con template obligatorio (finding, mitigación compensatoria, owner, fecha revisión 90 días, reviewer ≠ implementador).
  - **Reviewer:** Roger para items P1 estándar; si Roger es el implementador, CTO o tech lead externo.
  - **Enforcement CI:** regex que cuenta archivos en `risk-accepted/`. Si >3, build falla hasta que se reduzcan o el CTO firme excepción explícita.
  - Revisión 90 días hard-coded: GH Action scheduled lee frontmatter de cada archivo, abre issue automática cuando llega la fecha.

**Priorización degradada (contingencia 1-dev Sprint 2):** si solo 1 dev está disponible, el orden de descarte es: (1) mantener enforcement CI completo — no negociable; (2) mantener AES-GCM completo — no negociable por compliance GDPR; (3) recortar ALTOS al subset core: auth hardening (6 items clave) + multi-tenant (decoradores + 5 isolation tests críticos) + infra (Dockerfile + GH Actions OIDC). Se posponen a Sprint 3: rate limiters per-endpoint desde YAML, endpoint `GET /api-keys/status`, separator injection guards WS, Redis adapter (si solo hay 1 réplica prod, el WS in-memory sigue funcionando temporalmente).

### Ceremonias y Checkpoints (obligatorio)

El V2 demostró 67% regresión. Esto no es un proyecto donde las ceremonias sean opcionales — son el mecanismo que detecta desviación antes de que contamine el siguiente sprint.

- **Mid-sprint checkpoint (día 7 de cada sprint):** demo 30 min con Roger. Qué está cerrado, qué está en riesgo, qué mover a stretch. Si >30% del committed está en rojo al día 7, re-scoping inmediato.
- **Retrospectiva Sprint 1 → Sprint 2 (bloqueante):** Sprint 2 no se abre hasta que la retro esté cerrada en `_bmad-output/retrospectives/sprint-01-security.md`. Focus mínimo: qué items del committed fueron más costosos de lo estimado, qué tests dieron más valor, qué regresiones aparecieron en staging.
- **Retrospectiva Sprint 2 (previa a re-auditoría V3):** tras cierre Sprint 2, antes de disparar la auditoría externa, retro que valida enforcement CI está activo y pasando.
- **Daily async:** status por canal Slack/equivalente a las 10:00 — P0 en riesgo se escala mismo día.

### Resumen del Scope (tabla única para referencia)

| Aspecto | Sprint 1 (committed) | Sprint 1 (stretch) | Sprint 2 | Fuera de scope |
|---|---|---|---|---|
| P0 items | 8 | 3 | 1 (AES-GCM migration) | 0 |
| P1 items (ALTOS) | 0 | 0 | 60 (hasta 3 aceptables con risk acceptance) | 0 |
| Enforcement CI | `gitleaks` + `trufflehog` básico | - | Lint rule + YAML test + mutation testing + coverage gate | - |
| Testing budget | 40% effort | - | 40% effort | - |
| MEDIOS | - | - | - | 6 items → Sprint 3 |
| Infra ceremonies | Mid-sprint + retro | - | Mid-sprint + retro + pre-V3 retro | - |

## Functional Requirements

**Formato:** `FR-<AREA>-<NNN>: <capacidad o enforcement> — traza: <IDs del informe V2>`

Cada FR es testable, implementation-agnostic, y traza a ≥1 hallazgo documentado en `docs/SECURITY_AUDIT_2026_V2.md`. Los FRs agrupan por **categoría de capacidad**, no 1:1 por hallazgo, para evitar ~120 FRs triviales que serían acceptance criteria. La trazabilidad bidireccional finding↔FR vive en `security-contracts/finding-to-fr-mapping.yaml` (FR-CI-009); las stories enumerarán los IDs V2 específicos que cierran.

**Scope considerado y descartado — webhooks entrantes:** no existen en el codebase actual (verificado vía grep sobre `src/**/*.controller.ts`). La integración LeadCars es síncrona pull (backend → CRM). Si se añaden en el futuro, requerirán FR con HMAC + IP allowlist + replay protection + timestamp tolerance.

### Identity & Authentication (FR-AUTH)

- **FR-AUTH-001:** El sistema rechaza cualquier JWT cuyo header `alg` no esté en whitelist (`RS256`, `HS256`). Tokens con `alg: none`, `alg: HS256` firmados con clave pública (algorithm confusion), o `alg` ausente son rechazados con 401. — traza: CRIT-004, AUTH-007, AUTH-012
- **FR-AUTH-002:** El sistema valida `kid` desde el header del JWT, nunca desde el payload. Un JWT con `kid` solo en payload es tratado como inválido. — traza: CRIT-003, AUTH-015
- **FR-AUTH-003:** El sistema valida `iss` y `aud` en todos los JWT contra whitelist por tipo de token (user/visitor/bff). Tokens sin `iss`/`aud` o con valores no whitelisted son rechazados. — traza: AUTH-018, AUTH-019
- **FR-AUTH-004:** El sistema valida `exp` y `nbf` en todos los JWT con clock skew máximo 30 s. — traza: AUTH-021
- **FR-AUTH-005:** Los endpoints de autenticación (`/login`, `/register`, `/pixel/token`, `/refresh`, `/accept-invite`) aplican backoff exponencial tras intentos fallidos:
  - Contador por tupla `(IP, user)`: 3 intentos libres, 4º=1 s, 5º=5 s, 6º=30 s, 7º+=bloqueo 15 min.
  - Contador adicional **global por user** (anti-botnet rotando IPs): 50 intentos fallidos en 1 h sobre el mismo user → bloqueo 1 h del user para todas las IPs + alerta en audit log.
  - **Reset:** un login exitoso resetea ambos contadores para esa tupla y user. Sin login exitoso, los contadores se resetean tras 24 h de inactividad.
  - El usuario cambiando legítimamente de red (IP nueva) empieza con contador limpio para `(IP_nueva, user)` salvo que el global por user esté activo.
  - — traza: AUTH-004, AUTH-005
- **FR-AUTH-006:** El sistema mantiene blacklist de JWT revocados (logout, revoke-all-sessions) con TTL = expiración natural del token. Verificación en cada request autenticado. — traza: AUTH-008, AUTH-011
- **FR-AUTH-007:** El sistema emite API keys como 256 bits criptográficamente aleatorios, no derivados de dominio ni datos predecibles. — traza: CRIT-007, AUTH-002
- **FR-AUTH-008:** El sistema cifra API keys en reposo con AES-256-GCM (AEAD). La migración desde AES-CBC ocurre con dual-read por 30 días + rollback flag (ver runbook en Step 7). — traza: CRIT-005, AUTH-006
- **FR-AUTH-009:** El sistema rota API keys con ventana de gracia configurable (default 30 días) durante la cual ambas keys (vieja y nueva) son aceptadas, y reporta el estado vía `GET /api-keys/status`. — traza: AUTH-009, API-028
- **FR-AUTH-010:** El sistema emite warning en logs y audit trail cuando una API key supera 90 días sin rotación. — traza: AUTH-010
- **FR-AUTH-011:** El JWKS endpoint (`/jwks`) sirve solo claves públicas activas con `Cache-Control: max-age=3600` y es accesible sin autenticación. — traza: AUTH-013
- **FR-AUTH-012:** El flujo OAuth del BFF valida `state` y `PKCE code_verifier` en callback; callbacks sin state válido o con state reutilizado son rechazados. — traza: AUTH-016, AUTH-017
- **FR-AUTH-013:** El sistema soporta rotación de claves de firma JWT (HS256 secret y RS256 private key) con `kid` versionado en JWKS, ventana de gracia configurable durante la cual claves nueva y vieja son aceptadas para verificación, y procedimiento documentado de revocación de emergencia (rotación inmediata + invalidación de tokens emitidos con la clave revocada). — traza: gap detectado en party mode (cubre exposición histórica de CRIT-001 con secretos en logs)

### Authorization & Tenant Isolation (FR-AUTHZ)

- **FR-AUTHZ-001:** El `RolesGuard` opera en modo fail-closed: un endpoint autenticado sin decorador `@Roles()` o `@Public()` explícito rechaza con 403.
  - **Prerrequisito de implementación (entregable previo al Sprint 1):** audit listado en `security-contracts/endpoint-roles-audit.md` enumerando cada uno de los 140+ endpoints HTTP y su rol/visibilidad esperada (`@Public()`, `@Roles('admin')`, `@Roles('commercial')`, `@Roles('admin','commercial')`). Sin este audit firmado por Roger, FR-AUTHZ-001 no puede entrar en sprint.
  - — traza: CRIT-008, AUTH-019, AUTH-020
- **FR-AUTHZ-002:** El sistema proporciona tres decoradores de contexto tenant mutuamente exclusivos: `@RequireTenantContext()`, `@OptionalTenantContext()`, `@NoTenantContext()`. Todo controller declara exactamente uno. — traza: DATA-001…DATA-021 (multi-tenant), CRIT-005
- **FR-AUTHZ-003:** Endpoints con `@RequireTenantContext()` extraen `companyId` del JWT y lo inyectan en todas las llamadas al repository layer. Queries sin `companyId` filtrado fallan en runtime. — traza: DATA-003, DATA-008, DATA-014
- **FR-AUTHZ-004:** Endpoints que reciben `:tenantId` / `:companyId` en path validan que coincida con `companyId` del JWT; mismatch retorna 403. — traza: DATA-002, DATA-011, DATA-019
- **FR-AUTHZ-005:** El mapeo de roles desde Keycloak (`realm_access.roles`) a roles internos (`admin`, `commercial`) es explícito, versionado, y testeado. Cambios al mapeo requieren migration note en CHANGELOG. — traza: AUTH-019
- **FR-AUTHZ-006:** El orden de guards en cualquier endpoint autenticado es `AuthGuard → RolesGuard → TenantContextGuard → controller`. Un endpoint con orden distinto falla en startup con error explícito. — traza: contrato arquitectónico Step 7 (cubre regresión potencial de CRIT-008 si guards se reordenan)

### API Surface Protection (FR-API)

- **FR-API-001:** Todo endpoint HTTP está declarado en `security-contracts/endpoint-protections.yaml` con sus controles requeridos (authentication, authorization, tenant_context, input_validation, rate_limit, logging_constraints). — traza: API-001…API-036 global
- **FR-API-002:** El sistema rechaza cualquier endpoint nuevo no declarado en el YAML vía test de CI (`endpoint-protections.spec.ts`). — traza: API-001 (enforcement)
- **FR-API-003:** El rate limiter usa Redis como store compartido con el WS adapter, no in-memory. — traza: API-015, WS-003
- **FR-API-004:** Endpoints definidos como `must_disable_in_production: true` en el YAML están guardados tras check `NODE_ENV !== 'production'` y fallan en prod si se invocan. — traza: API-032 (`/open-search` debug), API-033 (WS evento `test`)
- **FR-API-005:** Todas las requests con body JSON pasan por `ValidationPipe` global con `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. — traza: API-003, API-008
- **FR-API-006:** El sistema sirve `Deprecation` y `Sunset` headers (RFC 8594) en endpoints marcados como deprecated en el YAML. — traza: API-035
- **FR-API-007:** CORS está configurado con allowlist explícita de origins por entorno, sin wildcards en producción. — traza: API-011
- **FR-API-008:** Swagger/OpenAPI está deshabilitado en `NODE_ENV === 'production'`. — traza: API-034
- **FR-API-009:** El sistema expone `GET /api-keys/status` que retorna estado de rotación (`active`, `expiring_soon`, `rotation_in_grace_window`, `revoked`) para que clientes (plugin WP) detecten necesidad de rotación. — traza: AUTH-009, API-028

### Input & Injection Prevention (FR-INJ)

- **FR-INJ-001:** El `CriteriaConverter` rechaza campos fuera de whitelist por entidad. Queries dinámicas se parametrizan vía QueryBuilder; no hay concatenación de strings SQL. — traza: CRIT-009, INJ-001, INJ-004
- **FR-INJ-002:** Endpoints que aceptan URLs externas (`/leads/admin/test-connection`) validan contra allowlist de schemes (`https` solo), rechazan IPs privadas (RFC 1918), metadata endpoints (169.254.169.254, fd00::/8), localhost, y aplican DNS rebinding protection. — traza: CRIT-010, INJ-003
- **FR-INJ-003:** El body parser rechaza payloads que intenten prototype pollution (`__proto__`, `constructor`, `prototype` como keys). — traza: CRIT-011, INJ-005
- **FR-INJ-004:** Todas las queries Mongoose usan proyección explícita (`.select()` o `projection`); no hay uso de `$where`, `$function`, `mapReduce` con input de usuario. — traza: INJ-006, INJ-007
- **FR-INJ-005:** Uploads de archivos validan MIME type (whitelist), extensión, tamaño máximo, y magic bytes; archivos que no matcheen son rechazados antes de tocar disco. — traza: INJ-008, API-022

### Data Protection & Persistence (FR-DATA)

- **FR-DATA-001:** Todos los schemas Mongo de entidades multi-tenant (`Chat`, `Message`, `Commercial`, `TrackingEvent`, `Visitor`, `Consent`) incluyen campo `companyId` indexado. — traza: CRIT-005, DATA-004, DATA-007, DATA-012
- **FR-DATA-002:** Todos los repos V2 crean índice compuesto `{companyId: 1, <campo-query>: 1}` para queries multi-tenant. — traza: DATA-005, DATA-013
- **FR-DATA-003:** Todo acceso a entidad multi-tenant por ID requiere `companyId` en el filtro. Acceso sin `companyId` es **detectable** (vía mecanismo a definir en Architecture: lint, runtime guard, type-system, o combinación) y **rechazado** antes de tocar la base de datos. — traza: CRIT-012, DATA-009, DATA-016
- **FR-DATA-004:** Migraciones de schema que añaden `companyId` ejecutan backfill script idempotente; documentos sin `companyId` tras backfill bloquean deploy. — traza: DATA-020
- **FR-DATA-005:** Operaciones bulk (`updateMany`, `deleteMany`, `aggregate`) requieren filtro `companyId` obligatorio en pipeline; ausencia lanza error en runtime. — traza: DATA-010, DATA-017
- **FR-DATA-006:** El sistema cifra en reposo datos sensibles designados: API keys (AES-GCM), refresh tokens (hash + salt), credenciales CRM externas (AES-GCM). — traza: CRIT-005, DATA-018

### WebSocket Hardening (FR-WS)

- **FR-WS-001:** El gateway Socket.IO usa Redis adapter en `NODE_ENV === 'production'`. In-memory adapter falla el startup en prod. — traza: WS-003
- **FR-WS-002:** El handshake WS valida JWT en `auth.token`, extrae `companyId` y lo adjunta al socket. Handshakes sin token válido son rechazados. — traza: WS-001, WS-002
- **FR-WS-003:** Cada evento WS con `tenant_guard: required` en el YAML valida que el recurso accedido (chat, visitor, tenant) pertenezca al `companyId` del socket. La validación está implementada para todos los eventos del YAML; cualquier evento listado sin guard implementado falla el test de CI (FR-CI-008). — traza: WS-004, WS-005
- **FR-WS-004:** Room names y event payloads rechazan caracteres separadores (`:`, `/`, control chars) que puedan usarse para injection en namespaces. — traza: WS-006
- **FR-WS-005:** El gateway aplica handshake throttle (max N conexiones/min por IP) y per-event throttle desde el mismo store Redis que el HTTP rate limiter. — traza: WS-007

### Secrets & Observability (FR-OBS)

- **FR-OBS-001:** El logger global filtra claves sensibles (`password`, `secret`, `token`, `key`, `authorization`, `cookie`, patterns regex de JWT/API key) antes de escribir. Valores son reemplazados por `[REDACTED]`. — traza: CRIT-001, OBS-001
- **FR-OBS-002:** El código fuente no contiene `console.log` / `console.error` directos; linter prohibe usage fuera de `Logger` de Nest. — traza: OBS-002
- **FR-OBS-003:** `gitleaks` y `trufflehog` corren en pre-commit hook y en CI; secretos detectados bloquean commit/merge. — traza: INFRA-001, OBS-003
- **FR-OBS-004:** Credenciales en `.env` se rotan tras este PRD: AWS keys, Resend API key, Groq API key, JWT_SECRET, DB passwords. La rotación queda documentada en runbook con fecha. — traza: INFRA-002, OBS-004
- **FR-OBS-005:** `JWT_SECRET` no tiene fallback hardcoded; ausencia en env falla el startup. — traza: `main.ts:51` (CRIT implícito V2)
- **FR-OBS-006:** Audit trail persiste eventos de seguridad (login, logout, role change, API key create/revoke, consent change, access denied) en colección separada con retención mínima 2 años.
  - **Enforcement de retención:** un guard a nivel repository bloquea `deleteOne`/`deleteMany` sobre la colección audit si `createdAt > now - 2 años`.
  - **Compliance check semanal:** GH Action verifica que (a) la colección no tiene registros faltantes en ventanas esperadas (gap detection sobre timestamps), (b) el guard sigue activo (test de runtime).
  - — traza: OBS-005, GDPR art. 30, GDPR-002

### Supply Chain & Infrastructure (FR-INFRA)

- **FR-INFRA-001:** Dockerfile base image es Node LTS activa (Node 20 a fecha de este PRD), con tag específico (no `latest`), multi-stage build, y `USER node` non-root en runtime. — traza: INFRA-005, INFRA-006
- **FR-INFRA-002:** GitHub Actions workflows declaran `permissions: {}` mínimas por job (default read-only), `concurrency` explícito, y pin de actions por SHA (no por tag). — traza: INFRA-008, INFRA-009
- **FR-INFRA-003:** GitHub Actions usa OIDC para autenticación a AWS/cloud providers; no long-lived `AWS_ACCESS_KEY_ID` en secrets de repo. — traza: INFRA-010
- **FR-INFRA-004:** Keycloak corre en modo `production` (no `dev`/`start-dev`) en entornos productivos; HTTP puro deshabilitado, TLS obligatorio. — traza: INFRA-012
- **FR-INFRA-005:** MongoDB init scripts no contienen passwords hardcoded; credenciales inyectadas vía env vars. — traza: INFRA-003 (`scripts/mongo-init.js:12`)
- **FR-INFRA-006:** `docker-compose*.yml` productivo no expone puertos de DB/Redis al host; solo red interna. — traza: INFRA-014
- **FR-INFRA-007:** Dependencias npm auditadas semanalmente (`npm audit` + Dependabot); CVEs HIGH/CRITICAL bloquean merge. — traza: INFRA-015

### GDPR & Compliance (FR-GDPR)

- **FR-GDPR-001:** El sistema registra en audit log (FR-OBS-006) accesos a datos personales (visitor name, email, phone, DNI, IP) con actor, timestamp, tenant, campo accedido, legal basis. — traza: GDPR art. 30, GDPR-001
- **FR-GDPR-002:** Endpoints de consent (`/consents/*`) implementan revoke, renew, audit log per visitor; revocación es efectiva inmediatamente (propagada a todos los flujos de procesamiento). — traza: GDPR art. 7, GDPR-003
- **FR-GDPR-003:** El sistema proporciona endpoint/procedimiento administrativo para right-to-erasure (`DELETE /visitors/:id/erasure`) con borrado en cascada de todas las colecciones que contengan PII del visitor. — traza: GDPR art. 17, GDPR-004
- **FR-GDPR-004:** El sistema proporciona export de datos personales por visitor (right-to-portability) en formato JSON estructurado. — traza: GDPR art. 20, GDPR-005
- **FR-GDPR-005:** PII en logs está prohibida (FR-OBS-001 la sanitiza); nombres, emails, DNIs, teléfonos no aparecen en logs de aplicación ni en error traces. — traza: GDPR art. 5.1.f, OBS-007

### CI Enforcement (FR-CI)

- **FR-CI-001:** Test `test/security/endpoint-protections.spec.ts` lee `security-contracts/endpoint-protections.yaml` y valida vía reflection de NestJS metadata que cada controller declara los decoradores esperados. — traza: party mode Step 7 item 6
- **FR-CI-002:** Lint rule custom `eslint-plugin-guiders-security/require-tenant-context-decorator` falla build si un controller autenticado no declara `@RequireTenantContext|@OptionalTenantContext|@NoTenantContext`.
  - **Coste real estimado (party mode Amelia):** 1.5-2 días de implementación del plugin (AST traversal sobre TypeScript, detección de decoradores hermanos) + 1 día de tests del propio plugin. Presupuestar explícito en Sprint 2; no es "1 hora".
  - — traza: party mode Step 7 item 2
- **FR-CI-003:** CI falla build si hay `describe.skip` / `it.skip` en archivos matching `*isolation*.spec.ts` o `*security*.spec.ts`. — traza: Sprint 2 enforcement
- **FR-CI-004:** Coverage gate ≥90% branches en archivos matching `*isolation*.spec.ts`; coverage inferior falla build. — traza: party mode Step 8 (Quinn)
- **FR-CI-005:** Mutation testing (Stryker) corre semanalmente sobre módulos `auth/*` y multi-tenant repos; score mínimo configurable por módulo. — traza: party mode Step 8 (Quinn)
- **FR-CI-006:** `TimeProvider` inyectable aisla toda lógica dependiente de tiempo (expiración de JWT, API keys, WS handshake grace windows) para permitir tests con `jest.useFakeTimers()`. Refactor previa, presupuestada en Sprint 2 (~2 días). — traza: party mode Step 8 (Quinn)
- **FR-CI-007:** CI corre tests de time-travel sobre grace windows críticas (API key 30 d, refresh token 24 h, WS handshake). — traza: party mode Step 7 item 7
- **FR-CI-008:** Test de WS gateway lee `endpoint-protections.yaml` (sección `websocket.events`) y valida que cada evento listado con `tenant_guard: required` tiene guard implementado en código (vía reflection sobre `@SubscribeMessage`). Eventos en YAML sin guard, o eventos en código sin entrada en YAML, fallan el test. — traza: party mode Step 9 (Quinn) — cierra acoplamiento YAML↔código en WS
- **FR-CI-009:** El archivo `security-contracts/finding-to-fr-mapping.yaml` mantiene el mapping bidireccional `<finding-id-V2> ↔ <FR-id>`. CI valida (a) que cada finding del informe V2 que esté en scope (P0+P1) tiene al menos un FR mapeado, (b) que cada FR tiene al menos un finding origen, (c) excepciones explícitas (FRs nuevos sin finding directo, p.ej. FR-AUTH-013 y FR-AUTHZ-006) están marcadas con justificación. — traza: party mode Step 9 (Quinn) — cierra gap de auditoría externa V3

### Risk Management (FR-RISK)

- **FR-RISK-001:** Plantilla obligatoria para risk acceptance: archivos `security-contracts/risk-accepted/<finding-id>.md` con frontmatter (finding_id, severity, mitigación compensatoria, owner, reviewer, fecha_revision = today + 90 d, mergeSHA). — traza: party mode Step 8 (Bob), Sprint 2 contingency
- **FR-RISK-002:** Reviewer de un risk acceptance es distinto del implementador del fix original; CI valida vía regla en pre-merge que el autor del archivo ≠ el autor del último commit del archivo fixeado referenciado. — traza: party mode Step 8 (Bob)
- **FR-RISK-003:** CI falla merge si `security-contracts/risk-accepted/*.md` contiene >3 items activos (no expirados). — traza: Instructions ("hasta 3 P1 aceptables")
- **FR-RISK-004:** GH Action scheduled (semanal) lee frontmatter de `risk-accepted/*.md`, abre issue automática cuando `fecha_revision` está dentro de los 7 días; issue no cerrable sin revisión firmada. — traza: party mode Step 8 (Bob)

**Capability Contract Statement:** este listado de 68 FRs es el contrato vinculante de capacidades del PRD. Cualquier capacidad no listada aquí no existirá en el producto final salvo que se añada explícitamente (vía amend del PRD, no vía decisión de implementación). Las stories en `security-epics.md` se generarán a partir de estos FRs y enumerarán los IDs específicos del informe V2 que cierran (vía `finding-to-fr-mapping.yaml`).

---

## Non-Functional Requirements

> Scope: sólo categorías que aplican a un programa de **hardening de seguridad backend**. Scalability, Accessibility, Integration y Maintainability se omiten (no aplican o están cubiertos implícitamente en FR-CI-*). Cada NFR es medible y verificable en CI o re-auditoría V3.

### Security Posture

La métrica de éxito principal del programa. Leading indicators que predicen el cumplimiento de NFR-SEC-001.

- **NFR-SEC-001:** Re-auditoría V3 (post Sprint 2) reporta **0 hallazgos CRITICAL y 0 HIGH**. Hasta 20 MEDIUM aceptables. Esta es la condición de "done" del programa entero.
- **NFR-SEC-002:** **0 endpoints autenticados** sin decorador de tenant context (`@RequireTenantContext` | `@OptionalTenantContext` | `@NoTenantContext`). Medido por lint custom FR-CI-002 en cada build.
- **NFR-SEC-003:** **0 schemas Mongo de entidades multi-tenant** sin campo `companyId` indexado. Medido por test de startup que escanea `mongoose.models` (FR-DATA-001).
- **NFR-SEC-004:** **0 secretos detectados en repo** por gitleaks/trufflehog. Medido en pre-commit hook y CI gate (FR-OBS-003).
- **NFR-SEC-005:** **0 dependencias con CVE HIGH/CRITICAL** sin patch o sin risk acceptance firmada activa. Medido por `npm audit` + Dependabot en cada PR (FR-INFRA-007).

### Performance

El hardening introduce overhead (guards de tenant, sanitización de logs, cifrado AES-GCM, audit writes). Techos para que el hardening no degrade UX de forma silenciosa.

- **NFR-PERF-001:** El overhead agregado de guards de tenant + sanitización de logs + audit write asíncrono **no degrada P95 de endpoints HTTP en >15%** vs baseline pre-hardening. Medido en load test (k6 o Artillery) antes de cada release de sprint.
- **NFR-PERF-002:** AES-GCM dual-read durante ventana de migración Sprint 2 (FR-AUTH-008) **no degrada P95 de `/auth/api-key/verify` en >50ms** sobre baseline. Si se supera, abortar dual-read y fix-forward.
- **NFR-PERF-003:** WebSocket handshake con validación JWT completa + extracción de `companyId` + adjunto al socket completa en **<100ms P95**.
- **NFR-PERF-004:** Audit log write (FR-OBS-006) es **asíncrono y fire-and-forget con buffer**. Fallo de write no bloquea ni hace fallar el request principal, pero genera alerta (NFR-OBS-003).

### Availability

Redis es el nuevo SPOF introducido en Sprint 1; necesita comportamiento de degradación documentado explícitamente.

- **NFR-AVAIL-001:** Redis cae → API responde con **degradación documentada**: rate limiting se desactiva (fail-open con alerta), WS Socket.IO cluster pierde sticky sessions (fail-closed: nuevos handshakes rechazados con 503). No crashes globales del proceso.
- **NFR-AVAIL-002:** Mongo failover (replica set) **no causa downtime >30s** del API. Drivers configurados con retry writes + `serverSelectionTimeoutMS` apropiado (≤10s).
- **NFR-AVAIL-003:** Tras rotación de credenciales (FR-OBS-004), zero-downtime garantizado vía proceso documentado en runbook con ventana dual-read para cada credencial rotada.
- **NFR-AVAIL-004 — Risk Aceptado:** Redis **no se despliega en HA** en Sprint 1-2 por restricción de presupuesto. Documentado en `security-contracts/risk-accepted/redis-spof.md` (FR-RISK-001). Plan de HA en Sprint 3+.

### Observability

Sin métricas de runtime, no sabemos si los FRs funcionan en producción. Estos NFRs cierran el gap entre "implementado" y "funcionando".

- **NFR-OBS-001:** **100% de los eventos de seguridad** de FR-OBS-006 (login, logout, role change, API key create/revoke, consent change, access denied) persistidos en audit log con latencia P99 <5s desde el evento.
- **NFR-OBS-002:** Métricas Prometheus expuestas para: `auth_failure_total{reason}`, `tenant_isolation_violation_total{controller}`, `rate_limit_blocked_total{endpoint}`, `audit_write_failure_total`. Scrape interval ≤30s.
- **NFR-OBS-003:** Alertas Grafana configuradas para: spike `auth_failure_total` >50/min sostenido 5min, **cualquier** `tenant_isolation_violation_total > 0`, `audit_write_failure_total > 0`. Cada alerta tiene runbook asociado.
- **NFR-OBS-004:** Logs estructurados JSON con campos obligatorios: `timestamp`, `level`, `request_id`, `tenant_id` (si aplica), `actor_id` (si aplica). Verificable por sampling check en CI sobre logs de test.

### Compliance Verifiability

GDPR es auditable o no lo es. Estos NFRs convierten los FRs de GDPR en compromisos medibles.

- **NFR-COMP-001:** Right-to-erasure (FR-GDPR-003) completa borrado en cascada en **<7 días** desde request (límite GDPR art. 12.3 con margen). Medido por test E2E que verifica ausencia del visitor en todas las colecciones declaradas.
- **NFR-COMP-002:** Audit log de accesos a PII (FR-GDPR-001) es **inmutable** en ventana de retención (2 años): guard de repository rechaza updates/deletes; verificado por test de seguridad semanal en CI (FR-OBS-006).
- **NFR-COMP-003:** Inventario de PII mantenido en `security-contracts/pii-inventory.yaml` (qué campo, en qué colección, qué legal basis). CI falla si un schema Mongo añade campo nuevo no declarado en el inventario (lint custom o pre-commit hook).
- **NFR-COMP-004:** Export de datos personales (FR-GDPR-004) entrega JSON estructurado en **<24h** desde request. Medido por timestamp de request vs timestamp de delivery en audit log.

---

## Glossary

### IDs del informe V2

| Prefijo   | Área                                     | Ejemplo        |
| --------- | ---------------------------------------- | -------------- |
| `AUTH-`   | Authentication & token management        | AUTH-001…AUTH-021 |
| `API-`    | API surface (endpoints, guards, input)   | API-001…API-036 |
| `INJ-`    | Injection (SQL, SSRF, prototype pollution, NoSQL) | INJ-001…INJ-008 |
| `INFRA-`  | Infrastructure (Dockerfile, CI/CD, supply chain) | INFRA-001…INFRA-015 |
| `WS-`     | WebSocket (handshake, rooms, throttle)   | WS-001…WS-012 |
| `DATA-`   | Multi-tenant data isolation              | DATA-001…DATA-021 |
| `CRIT-`   | Critical findings cross-área (numeración del summary V2) | CRIT-001…CRIT-012 |
| `GDPR-`   | GDPR-specific findings                   | GDPR-001…GDPR-005 |
| `OBS-`    | Observability / logging                  | OBS-001…OBS-007 |

### Acrónimos y términos

| Término               | Definición en contexto                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| AEAD                  | Authenticated Encryption with Associated Data — cifrado que garantiza confidencialidad + integridad (AES-GCM) |
| ASVS L2               | OWASP Application Security Verification Standard, Level 2 (standard)                                         |
| BFF                   | Backend for Frontend — patrón para gestionar flujo OAuth en nombre del frontend                                |
| companyId             | Identificador del tenant en el modelo multi-tenant compartido (shared-database, discriminator en cada documento Mongo) |
| CQRS                  | Command Query Responsibility Segregation — patrón arquitectónico usado en guiders-backend                      |
| CriteriaConverter     | Clase en `src/context/shared/infrastructure/criteria-converter/` que transforma criterios de dominio en queries SQL/Mongo |
| DDD                   | Domain-Driven Design — arquitectura base del proyecto                                                         |
| Dual-read / dual-write | Estrategia de migración no-destructiva: escribe en nuevo formato, acepta lectura de ambos durante ventana de gracia |
| IDOR                  | Insecure Direct Object Reference — acceso no autorizado a recursos por manipulación de IDs                    |
| kid                   | Key ID — campo en header JWT que identifica la clave de verificación. **Bug V2:** se leía de `payload.kid` en lugar de `header.kid` |
| PII                   | Personally Identifiable Information — datos personales bajo GDPR (nombre, email, teléfono, DNI, IP, fingerprint) |
| P0 / P1               | Prioridad del hallazgo: P0 = CRÍTICO (CVSS ≥9.0 o impacto sistémico), P1 = ALTO (CVSS ≥7.0)                  |
| Risk acceptance       | Proceso formal de aceptar un riesgo residual con mitigación compensatoria documentada y firmada; ver FR-RISK-001 |
| SBOM                  | Software Bill of Materials (CycloneDX) — inventario de dependencias generado en CI                            |
| SPOF                  | Single Point of Failure — dependencia cuya caída tumba el servicio; Redis lo es en la arquitectura del Sprint 1 |
| TimeProvider          | Abstracción inyectable sobre `Date.now()` para permitir time-travel tests con `jest.useFakeTimers()` (FR-CI-006) |
| V2 / V3               | Versión del informe de auditoría de seguridad: V2 = fuente de este PRD (2026-04-21), V3 = re-auditoría post-hardening |
