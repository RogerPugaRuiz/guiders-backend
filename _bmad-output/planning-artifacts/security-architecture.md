---
stepsCompleted:
  - step-01-init
  - step-02-context
  - step-03-starter
  - step-04-decisions
  - step-05-patterns
  - step-06-structure
  - step-07-validation
  - step-08-complete
status: complete
completedAt: '2026-04-21'
inputDocuments:
  - _bmad-output/planning-artifacts/security-prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - project-context.md
  - AGENTS.md
workflowType: 'architecture'
project_name: 'guiders-backend'
user_name: 'Roger Puga'
date: '2026-04-21'
scope: 'Security Hardening P0+P1 — NestJS v11 + MongoDB + PostgreSQL + Socket.IO'
prdRef: '_bmad-output/planning-artifacts/security-prd.md'
---

# Security Architecture — guiders-backend

_Documento de decisiones arquitectónicas para el programa de Security Hardening (Sprint 1 + Sprint 2). Cada decisión traza a ≥1 FR del security PRD y ≥1 hallazgo del informe V2. Los agentes IA deben implementar según las reglas de enforcement definidas aquí._

---

## 1. Contexto y Restricciones

### Sistema en producción (brownfield)

- **Stack:** NestJS v11, DDD+CQRS, MongoDB (V2 activo), PostgreSQL (V1 legacy), Socket.IO v4.8.1
- **Multi-tenancy:** shared-database con `companyId` como discriminador de tenant en cada documento Mongo
- **Auth stack:** JWT (Keycloak RS256 para usuarios, RS256 backend para visitantes), API keys, Cookie BFF
- **Clientes:** SDK pixel JS, dashboard comercial (SPA), plugin WordPress
- **Hallazgos V2:** 166 total — este programa cierra los 40 P0 (CRÍTICOS) + 60 P1 (ALTOS)

### Restricciones de diseño no negociables

1. **Cero regresión en contratos API públicos** — todos los cambios son backward-compatible o llevan ventana de gracia ≥30 días con headers `Deprecation`/`Sunset`
2. **Enforcement automático sobre disciplina manual** — cada fix va acompañado de un guard en CI que impide la regresión
3. **DDD/CQRS intacto** — los helpers de seguridad se ubican en las capas correctas; no se mezcla lógica de negocio con lógica de seguridad en el mismo artefacto
4. **Result pattern obligatorio** — ningún guard, validador ni servicio de seguridad lanza excepciones para errores esperados

---

## 2. Decisiones Arquitectónicas

### DA-SEC-01 — Guard Pipeline: orden fijo y fail-closed

**Hallazgos:** CRIT-008, AUTH-019, AUTH-020 | **FRs:** FR-AUTHZ-001, FR-AUTHZ-006

**Decisión:**

El orden de guards en todo endpoint autenticado es **inmutable**:

```
AuthGuard → RolesGuard → TenantContextGuard → Controller
```

El `RolesGuard` opera en **fail-closed**: si un endpoint autenticado no tiene `@Roles()` ni `@Public()`, retorna **403** (no 200). El comportamiento actual "sin roles = pasa todo" es el bug CRIT-008.

**Tres decoradores de visibilidad mutuamente exclusivos:**

```typescript
@RequireTenantContext()   // 23/25 controllers — extrae companyId del JWT
@OptionalTenantContext()  // acepta con o sin tenant
@NoTenantContext()        // auth flows, health, JWKS — sin tenant
```

Un controller que no declare exactamente uno de los tres **falla el build** (FR-CI-002).

**Prerrequisito de Sprint 1:** antes de activar fail-closed, generar `security-contracts/endpoint-roles-audit.md` con los 140+ endpoints y su rol/visibilidad esperada. Sin este audit firmado, FR-AUTHZ-001 no entra en sprint.

**Implicaciones de implementación:**

- `RolesGuard` existente: invertir lógica de default — `if (!roles) throw new ForbiddenException()`
- Nuevo `TenantContextGuard` en `src/context/shared/infrastructure/guards/tenant-context.guard.ts`
- `@RequireTenantContext`, `@OptionalTenantContext`, `@NoTenantContext` como decoradores custom en `src/context/shared/infrastructure/decorators/`
- `AuthModule` registra los tres guards globalmente; los controllers declaran el decorador de tenant

**Rollout seguro:**

1. Generar audit de endpoints → firmar con Roger
2. Activar `TenantContextGuard` en modo **warning** (log, no block) durante 48h en staging
3. Verificar que dashboard y SDK no rompen
4. Activar en modo **block** → staging → producción

---

### DA-SEC-02 — Multi-Tenant Isolation: 3 capas defensivas

**Hallazgos:** DATA-001…DATA-021, CRIT-005, CRIT-012 | **FRs:** FR-DATA-001…FR-DATA-005, FR-AUTHZ-002…FR-AUTHZ-004

**Decisión:**

La causa raíz del 67% de regresión V1→V2 es que el fix se aplicó a un aggregate y no se replicó en los siguientes. La solución no es un fix puntual sino un **patrón con 3 capas que se autoforzan**:

#### Capa 1 — Schema (MongoDB)

Todo documento de entidad multi-tenant **debe** tener `companyId` indexado y obligatorio:

```typescript
// En todos los schemas V2 multi-tenant
companyId: { type: String, required: true, index: true }
```

Afectados: `ChatSchema`, `MessageSchema`, `CommercialSchema`, `TrackingEventSchema`, `VisitorSchema`, `ConsentSchema`, `SavedFilterSchema`, `LeadSchema`.

Un test de startup escanea `mongoose.connection.modelNames()` y verifica que cada modelo con `companyId` lo tenga definido como `required + index`. Falla si no.

#### Capa 2 — Repository base class

Nueva clase `BaseTenantAwareRepository<T>` en `src/context/shared/infrastructure/persistence/base-tenant-aware.repository.ts`:

```typescript
abstract class BaseTenantAwareRepository<TDoc, TDomain> {
  // Único punto de acceso permitido para queries por ID
  protected async findByIdWithinTenant(
    id: string,
    companyId: string,
    model: Model<TDoc>,
  ): Promise<TDoc | null> {
    return model.findOne({ _id: id, companyId }).lean();
  }

  // Para operaciones bulk: obliga a incluir companyId
  protected buildTenantFilter(companyId: string, extra?: FilterQuery<TDoc>) {
    return { ...extra, companyId };
  }
}
```

**Regla de lint:** `eslint-plugin-guiders-security/no-mongo-query-without-tenant` — detecta llamadas a `model.findOne`, `model.find`, `model.findById`, `model.updateOne`, `model.deleteOne` fuera de `BaseTenantAwareRepository` y falla el build. Los repos V2 deben extender `BaseTenantAwareRepository`.

#### Capa 3 — Tests de isolation

Por cada aggregate V2 multi-tenant, un archivo `src/context/<context>/infrastructure/persistence/__tests__/<aggregate>.isolation.spec.ts`:

```typescript
it('debe retornar null cuando chatId existe pero pertenece a otra empresa', async () => {
  const otherCompanyId = Uuid.random().value;
  const chat = await factory.createChat({ companyId: otherCompanyId });
  const result = await repo.findById(ChatId.create(chat.id), 'different-company-id');
  expect(result.isErr()).toBe(true); // 404, no 403
});
```

**Enforcement en CI:** `describe.skip` e `it.skip` en archivos `*isolation*.spec.ts` fallan el pipeline (regex check). Coverage gate ≥90% branches en estos archivos.

**Backfill (FR-DATA-004):**

Script idempotente `scripts/backfill-company-id.ts` que, para cada colección afectada, asigna `companyId` a documentos que no lo tengan, usando la lógica de negocio correcta (ej. inferir de `visitorId → visitor.companyId`). El deploy queda bloqueado si quedan documentos sin `companyId` tras ejecutar el backfill.

---

### DA-SEC-03 — JWT Hardening

**Hallazgos:** CRIT-003, CRIT-004, AUTH-007, AUTH-012, AUTH-015, AUTH-018, AUTH-019, AUTH-021 | **FRs:** FR-AUTH-001…FR-AUTH-006, FR-AUTH-013

**Decisión:**

Cuatro fixes en `token-verify.service.ts` que se implementan como una única PR atómica:

#### Fix 1 — `kid` desde header (no payload)

```typescript
// ANTES (bug CRIT-003)
const kid = decodedToken.payload?.kid;

// DESPUÉS
import { decode } from 'jsonwebtoken';
const decoded = decode(token, { complete: true });
const kid = (decoded?.header as any)?.kid; // siempre del header
if (!kid) throw new UnauthorizedException('Token sin kid en header');
```

#### Fix 2 — Whitelist de algoritmos

```typescript
// En jwt.verify() — obligatorio en TODOS los puntos de verificación
jwt.verify(token, publicKey, {
  algorithms: ['RS256'],  // usuarios vía Keycloak
});

jwt.verify(token, secret, {
  algorithms: ['HS256'],  // visitantes — backend-issued
});
// 'none', 'HS256 con clave pública', 'alg confusion' → rechazados automáticamente
```

#### Fix 3 — Validación de `iss` y `aud`

```typescript
// Whitelist por tipo de token (en config del módulo JWT)
const JWT_CONFIG = {
  user: {
    algorithms: ['RS256'] as Algorithm[],
    issuer: process.env.KEYCLOAK_ISSUER,
    audience: process.env.KEYCLOAK_CLIENT_ID,
  },
  visitor: {
    algorithms: ['HS256'] as Algorithm[],
    issuer: process.env.BACKEND_ISSUER, // 'guiders-backend'
    audience: 'visitor',
  },
};
```

#### Fix 4 — Eliminar fallback hardcoded de `JWT_SECRET`

```typescript
// En main.ts — ELIMINAR
// const secret = process.env.JWT_SECRET ?? 'fallback-hardcoded'; // ❌

// CORRECTO: falla en startup si no existe
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET env var is required');
```

**JWT Blacklist (FR-AUTH-006):**

Nueva colección MongoDB `jwt_revocations` en `src/context/auth/infrastructure/persistence/`:

```typescript
// Schema
{ jti: string, exp: number, createdAt: Date }
// TTL index: expira automáticamente cuando el token expira
{ createdAt: 1 }, { expireAfterSeconds: 0, expireAfterSecondsField: 'exp' }
```

`AuthGuard` verifica `jti` contra esta colección en cada request autenticado. Cache Redis con TTL corto (60s) para evitar hits de Mongo en cada request.

**Rotación de claves de firma (FR-AUTH-013):**

JWKS endpoint (`/jwks`) sirve claves con `kid` versionado. Al rotar: nueva clave recibe nuevo `kid`, la antigua permanece en JWKS por el tiempo máximo de vida del token (15 min para usuarios). Runbook en `docs/runbooks/jwt-key-rotation.md`.

---

### DA-SEC-04 — Cifrado: AES-256-CBC → AES-256-GCM

**Hallazgos:** CRIT-005, CRIT-006, AUTH-006 | **FRs:** FR-AUTH-008, FR-DATA-006

**Decisión:**

El `EncryptionService` actual usa AES-256-CBC sin MAC → vulnerable a padding oracle y tampering silencioso. Migración a **AES-256-GCM** (AEAD: confidencialidad + autenticidad en una sola operación).

**Nuevo `EncryptionService` en `src/context/shared/infrastructure/encryption/`:**

```typescript
// Cifrado — AES-256-GCM
encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);         // 96 bits para GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();           // 128-bit auth tag
  // Formato: iv(12) + tag(16) + ciphertext — todo en base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

// Descifrado — AES-256-GCM
decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const encrypted = buf.slice(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}
```

**Estrategia dual-read/dual-write (runbook CRIT-006):**

El `EncryptionService` detecta el formato en la desencriptación:

```typescript
decrypt(ciphertext: string): string {
  if (this.isGcmFormat(ciphertext)) {
    return this.decryptGcm(ciphertext);
  }
  // Formato legacy AES-CBC — solo en ventana de migración (30 días)
  if (process.env.AES_CBC_LEGACY_READS === 'true') {
    return this.decryptCbcLegacy(ciphertext);
  }
  throw new Error('Formato de cifrado desconocido y legacy reads desactivados');
}
```

**Fases del runbook:**
1. **Sprint 1:** añadir flag `API_KEY_CIPHER=aes-gcm` deprecated warning. CBC sigue funcionando.
2. **Sprint 2, Día 1-2:** implementar GCM + dual-write + dual-read con `AES_CBC_LEGACY_READS=true`
3. **Sprint 2, Día 3:** dry-run en staging con dataset anonimizado
4. **Sprint 2, Día 4:** cutover producción (dual-write activo, dual-read 30 días)
5. **Día 35:** deshabilitar `AES_CBC_LEGACY_READS`, re-encriptar legacy pendientes, commit + deploy

**API Keys (FR-AUTH-007):**

```typescript
// ANTES (bug CRIT-007)
const apiKey = crypto.createHash('sha256').update(domain).digest('hex');

// DESPUÉS
const apiKey = crypto.randomBytes(32).toString('hex'); // 256 bits aleatorios
```

Tras el cambio, invalidar todas las API keys existentes (generadas con hash) y notificar a clientes con 30 días de ventana usando el endpoint `GET /api-keys/status` (FR-API-009).

---

### DA-SEC-05 — WebSocket Hardening

**Hallazgos:** WS-001…WS-012 | **FRs:** FR-WS-001…FR-WS-005

**Decisión:**

#### Redis Adapter (FR-WS-001)

```typescript
// En app.module.ts — solo en production
if (process.env.NODE_ENV === 'production') {
  IoAdapter → RedisIoAdapter (custom adapter que extiende IoAdapter)
}
// La instancia Redis es COMPARTIDA con el rate limiter (DA-SEC-06)
// Namespace Redis para WS: 'ws:'
// Namespace Redis para rate limit: 'rl:'
```

Si Redis cae en producción: nuevo handshake rechazado con **503** (fail-closed para WS). Sockets existentes siguen activos en la réplica donde están conectados.

#### Handshake JWT-only (FR-WS-002)

```typescript
// En el WS Gateway — handleConnection()
const token = socket.handshake.auth?.token;
if (!token) { socket.disconnect(); return; }

const payload = await this.jwtService.verifyVisitorToken(token);
if (!payload) { socket.disconnect(); return; }

// companyId y visitorId se extraen del JWT, NUNCA del handshake body
socket.data.companyId = payload.companyId;
socket.data.visitorId = payload.sub;
```

El SDK pixel debe obtener un JWT visitante vía `POST /pixel/token` antes de abrir el socket.

#### Room names y separator injection (FR-WS-004)

Helper `buildRoomName` en `src/context/shared/infrastructure/websocket/room-name.helper.ts`:

```typescript
// Valores permitidos — solo alphanumeric + guión
const ROOM_NAME_SAFE = /^[a-zA-Z0-9\-_]+$/;

function buildRoomName(params: { type: 'visitor' | 'chat' | 'commercial'; id: string; companyId: string }): string {
  const { type, id, companyId } = params;
  if (!ROOM_NAME_SAFE.test(id) || !ROOM_NAME_SAFE.test(companyId)) {
    throw new WsException('ID con caracteres inválidos');
  }
  return `${type}:${companyId}:${id}`;
}
```

Prohibido construir nombres de sala con template literals directamente en los handlers.

#### Eventos "must_disable_in_production" (FR-API-004)

El evento WS `test` y el endpoint HTTP `/open-search/*` solo se registran si `process.env.NODE_ENV !== 'production'`. Guard de startup que verifica y lanza error si se detectan en prod.

---

### DA-SEC-06 — Rate Limiting con Redis compartido

**Hallazgos:** AUTH-004, AUTH-005, WS-007, API-015 | **FRs:** FR-AUTH-005, FR-API-003, FR-WS-005

**Decisión:**

El rate limiter actual usa store in-memory → inútil con múltiples réplicas Node. Se migra a **Redis store** con la misma instancia que el WS adapter (DA-SEC-05), diferenciados por namespace.

**Backoff exponencial en auth endpoints (FR-AUTH-005):**

NestJS `@nestjs/throttler` no soporta backoff exponencial out-of-the-box. Solución: `ThrottlerStorageRedisService` custom en `src/context/shared/infrastructure/rate-limit/`:

```typescript
// Contador por tupla (IP + userId)
// Contador global por userId (anti-botnet rotando IPs)
interface RateLimitEntry {
  count: number;
  blockedUntil?: number;  // timestamp ms
}

// Tabla de backoff:
// 1-3 intentos: sin delay
// 4to: +1s
// 5to: +5s
// 6to: +30s
// 7to+: bloqueo 15 min
// Global por userId: 50 fallidos/1h → bloqueo 1h
```

**Configuración por endpoint** (desde `security-contracts/endpoint-protections.yaml`):

```yaml
rate_limit:
  standard: { window: 60, max: 100 }
  progressive_auth: { backoff: [1000, 5000, 30000], lockout: 900000 }
  strict: { window: 60, max: 20 }
  generous: { window: 60, max: 1000 }
```

**Degradación cuando Redis cae (NFR-AVAIL-001):** rate limiter cae a fail-open (permite requests) + emite alerta Prometheus `redis_unavailable_total`.

---

### DA-SEC-07 — Logging Sanitization y Audit Trail

**Hallazgos:** CRIT-001, INFRA-001, INFRA-002, OBS-001…OBS-007 | **FRs:** FR-OBS-001…FR-OBS-006

**Decisión:**

#### Logger Sanitizer (FR-OBS-001)

Pino redactor global en la configuración de `PinoLogger` (NestJS):

```typescript
// En app.module.ts — PinoModule config
redact: {
  paths: [
    'password', 'secret', 'token', 'key', 'authorization', 'cookie',
    '*.password', '*.secret', '*.token', '*.apiKey', '*.privateKey',
    '*.refreshToken', '*.secretKey', 'req.headers.authorization',
    'req.headers.cookie',
  ],
  censor: '[REDACTED]',
}
```

Adicionalmente, regex para detectar JWT (formato `eyJ...`) y API keys (formato hex 64 chars) en valores string y censurarlos antes del log.

**Eliminar logs de secretos hardcodeados:**

- `app.module.ts:300-315` — eliminar logs de `JWT_SECRET`, `JWT_PRIVATE_KEY`
- `auth-visitor-jwt.ts:69,71,101,103,144-163` — eliminar logs de claves RSA privadas

#### Audit Trail (FR-OBS-006)

Nueva colección `audit_logs` en MongoDB con schema inmutable:

```typescript
// src/context/shared/infrastructure/audit/audit-log.schema.ts
@Schema({ collection: 'audit_logs', timestamps: false })
class AuditLogDocument {
  @Prop({ required: true }) eventType: AuditEventType;  // enum
  @Prop({ required: true }) actorId: string;
  @Prop({ required: true }) actorType: 'user' | 'commercial' | 'visitor' | 'system';
  @Prop({ required: true }) companyId: string;
  @Prop() resourceType?: string;   // 'chat', 'visitor', 'apiKey', etc.
  @Prop() resourceId?: string;
  @Prop({ required: true }) timestamp: Date;
  @Prop() metadata?: Record<string, string>;  // sin PII — solo IDs y tipos
}
// TTL index: retención mínima 2 años
// NO hay TTL index — documentos inmutables por 2 años
// Guard de repo: rechaza deleteOne/deleteMany si createdAt < now - 2 años
```

**`AuditLogInterceptor`** en `src/context/shared/infrastructure/interceptors/audit-log.interceptor.ts`:
- Se aplica vía decorador `@AuditLog({ eventType, resourceType })` sobre handlers
- Fire-and-forget asíncrono: no bloquea el request principal (NFR-PERF-004)
- Buffer interno de 100 eventos con flush cada 500ms o cuando se llena

**Eventos auditados obligatorios:** login, logout, role_change, api_key_create, api_key_revoke, consent_change, access_denied, visitor_erasure.

---

### DA-SEC-08 — Injection Prevention

**Hallazgos:** CRIT-009, CRIT-010, CRIT-011, INJ-001…INJ-008 | **FRs:** FR-INJ-001…FR-INJ-005

**Decisión:**

#### CriteriaConverter con whitelist (FR-INJ-001)

`CriteriaConverter` en `src/context/shared/infrastructure/criteria-converter/` necesita whitelist de campos permitidos por entidad:

```typescript
// Nueva interfaz
interface CriteriaConverterOptions {
  allowedFields: string[];  // whitelist explícita
}

// Uso en cada aggregate — ejemplo Chat
const converter = new CriteriaConverter({
  allowedFields: ['status', 'priority', 'assignedTo', 'createdAt', 'companyId'],
});

// El converter RECHAZA cualquier campo no en allowedFields
if (!this.options.allowedFields.includes(fieldName)) {
  return err(new InvalidCriteriaFieldError(fieldName));
}
```

Test de regresión: suite de payloads de SQL injection OWASP (incluye `1=1`, `' OR '1'='1`, `; DROP TABLE`, null bytes) — todos deben retornar error de validación, nunca ejecutarse.

#### SSRF Prevention (FR-INJ-002)

Validator `UrlAllowlistValidator` en `src/context/shared/infrastructure/validators/url-allowlist.validator.ts`:

```typescript
class UrlAllowlistValidator {
  private readonly BLOCKED_RANGES = [
    // RFC 1918
    /^10\.\d+\.\d+\.\d+$/,
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
    /^192\.168\.\d+\.\d+$/,
    // Link-local y metadata
    /^169\.254\.\d+\.\d+$/,  // AWS metadata
    /^127\.\d+\.\d+\.\d+$/,  // localhost
    /^::1$/,                  // IPv6 localhost
    /^fd[0-9a-f]{2}:/i,       // IPv6 ULA
  ];

  validate(url: string, allowedHosts?: string[]): Result<URL, ValidationError> {
    const parsed = this.parseUrl(url);
    if (parsed.isErr()) return parsed;

    const { hostname, protocol } = parsed.unwrap();

    if (protocol !== 'https:') return err(new ValidationError('Solo HTTPS permitido'));
    if (this.isBlockedRange(hostname)) return err(new ValidationError('Host en rango bloqueado'));
    if (allowedHosts && !allowedHosts.includes(hostname)) {
      return err(new ValidationError(`Host no en allowlist: ${hostname}`));
    }
    return ok(parsed.unwrap());
  }
}
```

Se usa en: `LlmConfigController.baseUrl` (SSRF actual), `LeadsController.testConnection` (endpoint SSRF detectado).

#### Prototype Pollution (FR-INJ-003)

En el body parser global de NestJS:

```typescript
// En main.ts — antes de app.useGlobalPipes()
app.use((req, res, next) => {
  const sanitize = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    const dangerous = ['__proto__', 'constructor', 'prototype'];
    dangerous.forEach(key => { if (key in obj) delete obj[key]; });
    Object.values(obj).forEach(sanitize);
    return obj;
  };
  if (req.body) req.body = sanitize(req.body);
  next();
});
```

---

### DA-SEC-09 — GDPR: Erasure, Audit PII, Consentimiento

**Hallazgos:** GDPR-001…GDPR-005 | **FRs:** FR-GDPR-001…FR-GDPR-005

**Decisión:**

#### Right-to-Erasure (FR-GDPR-003)

Nuevo comando `EraseVisitorCommand` en `src/context/visitors-v2/application/commands/erase-visitor/`:

```typescript
// Borra en cascada en TODAS las colecciones que contienen PII del visitor
// Orden: messages → chats → tracking_events → leads → consents → visitor
// Cada borrado se loguea en audit_trail
// El visitor se reemplaza por un "tombstone" {_id, companyId, erasedAt, status: 'erased'}
// para mantener integridad referencial sin datos personales
```

Endpoint: `DELETE /visitors/:id/erasure` con `@Roles('admin')` + `@RequireTenantContext()`.

CLI: `node bin/guiders-cli.js forget-visitor --visitorId <uuid> --companyId <uuid>` (mismo command internamente).

**Verificación en test E2E:** tras ejecutar erasure, ninguna colección declarada en `security-contracts/pii-inventory.yaml` debe contener datos del visitor (excepto el tombstone).

#### PII Inventory (NFR-COMP-003)

Archivo `security-contracts/pii-inventory.yaml` declara qué campos contienen PII, en qué colección, y con qué base legal GDPR:

```yaml
collections:
  - name: visitors
    pii_fields:
      - field: name
        type: full_name
        legal_basis: consent
      - field: email
        type: email
        legal_basis: consent
      - field: phone
        type: phone
        legal_basis: consent
```

Lint custom (pre-commit hook) verifica que cualquier campo nuevo añadido a un schema Mongo con nombre que sugiera PII (`email`, `phone`, `name`, `dni`, `ip`, `fingerprint`) esté declarado en el inventario.

#### Legal Basis en Consents (FR-GDPR-002)

Añadir campo `legalBasis: 'consent' | 'legitimate_interest' | 'contract'` al schema de `ConsentDocument`. Migración con backfill asignando `'consent'` a registros existentes.

---

### DA-SEC-10 — DevSecOps Pipeline

**Hallazgos:** INFRA-001…INFRA-015 | **FRs:** FR-CI-001…FR-CI-009, FR-OBS-003, FR-OBS-004

**Decisión:**

#### Pipeline de CI — orden de ejecución obligatorio (FR-CI-001)

```yaml
# .github/workflows/ci.yml
jobs:
  security-gates:
    steps:
      - name: Secret Scan
        run: gitleaks detect --source . --no-git  # también en pre-commit hook

      - name: Dependency Audit
        run: npm audit --audit-level=high         # HIGH/CRITICAL bloquea merge

      - name: Lint (con reglas custom de seguridad)
        run: npm run lint                          # incluye eslint-plugin-guiders-security

      - name: Unit Tests
        run: npm run test:unit

      - name: Isolation Tests
        run: npm run test:isolation                # multi-tenant cross-tenant tests

      - name: Integration Tests
        run: npm run test:int

      - name: Endpoint Protections Audit
        run: npm run test -- test/security/endpoint-protections.spec.ts

      - name: SBOM Generation
        run: npx @cyclonedx/cyclonedx-npm --output-file sbom.json
        uses: actions/upload-artifact@v4
          with: { name: sbom, path: sbom.json }
```

#### ESLint Plugin Custom (FR-CI-002)

Nuevo paquete `eslint-plugin-guiders-security` en `src/security/eslint-plugin/`:

Reglas implementadas:

| Regla | Qué detecta | Severidad |
|---|---|---|
| `no-mongo-query-without-tenant` | `model.findOne/find/findById` fuera de `BaseTenantAwareRepository` | error |
| `require-tenant-context-decorator` | Controller autenticado sin `@RequireTenantContext\|@OptionalTenantContext\|@NoTenantContext` | error |
| `no-hardcoded-crypto-key` | Strings de 32+ chars hex dentro de código fuente | error |
| `no-console-log` | `console.log/error/warn` fuera de logger de NestJS | error |
| `require-guards-on-controllers` | Endpoint sin `@UseGuards` en controllers no marcados `@NoAuth` | warn→error |

**Coste real estimado:** 1.5-2 días implementar el plugin (AST traversal TypeScript) + 1 día tests del plugin. Presupuestado en Sprint 2.

**Override:** `// eslint-disable-next-line guiders-security/<rule>` requiere justificación en el mismo comentario; un pre-commit hook verifica que el disable tiene texto de justificación (no se acepta disable vacío).

#### Dockerfile y GH Actions (FR-INFRA-001…FR-INFRA-003)

```dockerfile
# Dockerfile — multi-stage, Node LTS (20), non-root
FROM node:20.19-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20.19-alpine AS runtime
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# NUNCA copiar .env.* en la imagen
USER appuser
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

```yaml
# GH Actions — permissions mínimas por job
jobs:
  build:
    permissions:
      contents: read       # solo lo necesario
      id-token: write      # para OIDC con AWS
    steps:
      - uses: actions/checkout@<SHA>   # pin por SHA, nunca por tag
      - uses: aws-actions/configure-aws-credentials@<SHA>
        with:
          role-to-assume: arn:aws:iam::...:role/github-actions-role  # OIDC, no long-lived keys
```

#### Risk Acceptance (FR-RISK-001…FR-RISK-004)

Template obligatorio `security-contracts/risk-accepted/<finding-id>.md`:

```yaml
---
finding_id: DATA-003
severity: HIGH
description: "Descripción del hallazgo"
compensating_mitigation: "Descripción de la mitigación compensatoria"
owner: Roger Puga
reviewer: <persona distinta del implementador>
review_date: 2026-07-21   # today + 90 días
merge_sha: <sha del commit que cierra el finding>
status: active
---
```

GH Action scheduled (semanal) lee frontmatter y abre issue automática cuando `review_date` está dentro de los 7 días. CI falla si hay >3 items `status: active` en el directorio.

---

### DA-SEC-11 — Infraestructura: Keycloak, MongoDB, Redis

**Hallazgos:** INFRA-003, INFRA-005…INFRA-012 | **FRs:** FR-INFRA-004…FR-INFRA-006

**Decisión:**

#### Keycloak en modo producción (FR-INFRA-004)

```bash
# Variables obligatorias en entorno productivo
KC_HOSTNAME_STRICT=true
KC_HOSTNAME_STRICT_HTTPS=true
KC_HTTP_ENABLED=false
KC_PROXY=edge              # si hay reverse proxy TLS termination

# Arranque (no start-dev)
kc.sh start --optimized
```

El backend verifica TLS en la conexión a Keycloak: `tls: { rejectUnauthorized: true, ca: process.env.KEYCLOAK_CA_CERT }`.

#### MongoDB TLS y credenciales mínimas (FR-INFRA-005)

```
# Connection string productivo
MONGO_URI=mongodb+srv://guiders_app:<password>@cluster.mongodb.net/guiders?tls=true&authSource=admin

# El usuario 'guiders_app' tiene solo los permisos mínimos:
# readWrite en 'guiders' database, sin acceso a 'admin' ni 'config'
```

`scripts/mongo-init.js` no tiene passwords hardcodeados — usa `process.env.MONGO_INIT_PASSWORD`.

#### Redis SPOF — Risk Aceptado (NFR-AVAIL-004)

Redis **no se despliega en HA** en Sprint 1-2. Documentado en `security-contracts/risk-accepted/redis-spof.md` con:
- Impacto si Redis cae: rate limiting desactivado (fail-open), WS multi-réplica degradado
- Mitigación: alertas Prometheus + runbook de recuperación <15 min
- Plan HA: Sentinel o Redis Cluster en Sprint 3

---

## 3. Contratos de Seguridad — Archivos Obligatorios

Los siguientes archivos son **artefactos versionados en el repositorio** que los tests de CI leen para validar enforcement:

```
security-contracts/
├── endpoint-protections.yaml         # 140+ endpoints con sus controles (FR-API-001)
├── finding-to-fr-mapping.yaml        # trazabilidad bidireccional V2-finding ↔ FR (FR-CI-009)
├── pii-inventory.yaml                # inventario de campos PII por colección (NFR-COMP-003)
├── endpoint-roles-audit.md           # prerrequisito de FR-AUTHZ-001 — firmado por Roger
└── risk-accepted/
    ├── redis-spof.md                  # DA-SEC-11
    └── <finding-id>.md               # hasta 3 activos permitidos (FR-RISK-003)
```

### Formato `endpoint-protections.yaml` (extracto)

```yaml
version: '1.0'
http:
  - controller: ChatV2Controller
    path: /v2/chats
    method: POST
    auth: jwt_user
    roles: [commercial, admin]
    tenant_context: required
    rate_limit: standard
    must_disable_in_production: false
    logging_constraints:
      redact_body_fields: [content]  # puede tener PII

  - controller: OpenSearchController
    path: /open-search/:index
    method: POST
    auth: none
    must_disable_in_production: true  # CRIT activo

websocket:
  events:
    - name: join-chat
      tenant_guard: required
      auth: jwt_required
    - name: test
      must_disable_in_production: true
```

---

## 4. Estructura de Archivos Nuevos

```
src/
├── context/
│   └── shared/
│       └── infrastructure/
│           ├── audit/
│           │   ├── audit-log.schema.ts
│           │   ├── audit-log.repository.ts
│           │   └── audit-log.interceptor.ts
│           ├── decorators/
│           │   ├── require-tenant-context.decorator.ts
│           │   ├── optional-tenant-context.decorator.ts
│           │   └── no-tenant-context.decorator.ts
│           ├── encryption/
│           │   └── encryption.service.ts          # AES-256-GCM (reemplaza AES-CBC)
│           ├── guards/
│           │   ├── tenant-context.guard.ts
│           │   └── roles.guard.ts                 # refactored: fail-closed
│           ├── persistence/
│           │   └── base-tenant-aware.repository.ts
│           ├── rate-limit/
│           │   ├── throttler-redis.storage.ts
│           │   └── progressive-auth-throttler.guard.ts
│           ├── validators/
│           │   └── url-allowlist.validator.ts
│           └── websocket/
│               └── room-name.helper.ts
│
├── security/
│   └── eslint-plugin/                             # eslint-plugin-guiders-security
│       ├── rules/
│       │   ├── no-mongo-query-without-tenant.ts
│       │   ├── require-tenant-context-decorator.ts
│       │   ├── no-hardcoded-crypto-key.ts
│       │   └── require-guards-on-controllers.ts
│       └── index.ts
│
├── context/
│   ├── auth/
│   │   └── infrastructure/
│   │       └── persistence/
│   │           └── jwt-revocation.repository.ts   # blacklist JWT
│   └── visitors-v2/
│       └── application/
│           └── commands/
│               └── erase-visitor/
│                   ├── erase-visitor.command.ts
│                   └── erase-visitor.command-handler.ts
│
security-contracts/
│   ├── endpoint-protections.yaml
│   ├── finding-to-fr-mapping.yaml
│   ├── pii-inventory.yaml
│   ├── endpoint-roles-audit.md
│   └── risk-accepted/
│       └── redis-spof.md
│
test/
└── security/
    ├── endpoint-protections.spec.ts               # CI: lee YAML, valida decoradores
    ├── ws-protections.spec.ts                     # CI: valida eventos WS vs YAML
    └── tenant-isolation/
        ├── chat.isolation.spec.ts
        ├── message.isolation.spec.ts
        ├── visitor.isolation.spec.ts
        ├── commercial.isolation.spec.ts
        ├── tracking-event.isolation.spec.ts
        └── consent.isolation.spec.ts

docs/
└── runbooks/
    ├── jwt-key-rotation.md
    ├── aes-gcm-migration.md
    ├── secret-rotation.md
    └── redis-failover.md
```

---

## 5. Archivos Existentes a Modificar

| Archivo | Cambio |
|---|---|
| `src/context/auth/infrastructure/services/token-verify.service.ts` | Fix `kid` de header + algorithms whitelist + `iss`/`aud` validation |
| `src/main.ts:51` | Eliminar fallback hardcoded de `JWT_SECRET` + prototype pollution middleware |
| `src/app.module.ts:300-315` | Eliminar logs de `JWT_SECRET`, `JWT_PRIVATE_KEY` + configurar Pino redactors |
| `src/context/auth/infrastructure/services/auth-visitor-jwt.ts:69,71,101,103` | Eliminar logs de claves RSA privadas |
| `src/context/shared/infrastructure/criteria-converter/*.ts` | Añadir whitelist de campos por entidad |
| `src/context/llm/infrastructure/controllers/llm-config.controller.ts` | Aplicar `UrlAllowlistValidator` a `baseUrl` |
| `src/context/leads/infrastructure/controllers/*.controller.ts` | Aplicar `UrlAllowlistValidator` a `testConnection` |
| `src/context/commercial/infrastructure/controllers/commercial.controller.ts` | Descomentar `@UseGuards` (actualmente comentado) |
| `**/mongo-*-repository.impl.ts` (todos los repos V2) | Extender `BaseTenantAwareRepository` |
| `**/*.schema.ts` (schemas V2 multi-tenant) | Añadir `companyId: required + index` |
| `Dockerfile` | Node LTS 20, multi-stage, USER non-root |
| `.github/workflows/*.yml` | `permissions: {}` mínimas, SHA pins, OIDC |
| `scripts/mongo-init.js` | Eliminar passwords hardcodeados |

---

## 6. Variables de Entorno Nuevas / Modificadas

```bash
# NUEVAS — obligatorias
REDIS_URL=redis://...                     # compartida WS adapter + rate limiter
BACKEND_ISSUER=guiders-backend            # para validación iss en JWT visitantes
KEYCLOAK_ISSUER=https://auth.domain/realm/... # para validación iss en JWT usuarios
KEYCLOAK_CLIENT_ID=guiders               # para validación aud en JWT usuarios
KEYCLOAK_CA_CERT=<base64 PEM>            # TLS pinning a Keycloak

# MODIFICADAS — con formato más seguro
ENCRYPTION_KEY=<32 bytes hex>            # YA EXISTE — debe regenerarse con crypto.randomBytes(32)

# MIGRACIÓN — temporales durante Sprint 2
AES_CBC_LEGACY_READS=true                # solo durante ventana de migración AES-GCM (30 días)

# ELIMINAR tras rotación
# JWT_SECRET → reemplazar por JWT_PRIVATE_KEY/JWT_PUBLIC_KEY (RS256)
# AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY → reemplazar con OIDC IAM role
```

---

## 7. Flujos de Implementación por Sprint

### Sprint 1 — P0 CRÍTICOS (8 committed)

**Secuencia de dependencias:**

```
1. Logger sanitizer (FR-OBS-001)
   → elimina logs de secretos en app.module.ts + auth-visitor-jwt.ts
   → configura Pino redactors
   → BLOQUEA todos los demás (sin esto, cualquier deploy fuga secretos)

2. JWT hardening atómico (FR-AUTH-001, FR-AUTH-002, FR-AUTH-003)
   → fix kid (header no payload)
   → algorithms whitelist
   → eliminar fallback JWT_SECRET en main.ts
   → Una sola PR con test regression

3a. companyId en schemas Mongo + backfill (FR-DATA-001, FR-DATA-002) — puede ir en paralelo con 3b
   → ChatSchema, MessageSchema, CommercialSchema, TrackingEventSchema
   → script backfill idempotente
   → isolation tests básicos

3b. RolesGuard fail-closed (FR-AUTHZ-001)
   → PRERREQUISITO: generar endpoint-roles-audit.md
   → activar con feature flag STRICT_ROLES=false → staging 48h → true
   → test de integración por endpoint autenticado

4. CriteriaConverter whitelist (FR-INJ-001)
   → whitelist de campos por entidad
   → SQL injection test suite

5. Fix findById cross-partition tracking-v2 (FR-DATA-002)
   → aislado, bajo riesgo
```

### Sprint 2 — P1 ALTOS + Enforcement CI

**Secuencia:**

```
1. TimeProvider refactor (FR-CI-006) — PRERREQUISITO para tests de expiración
2. AES-GCM dual-write + dual-read (FR-AUTH-008) — runbook completo
3. BaseTenantAwareRepository en todos los repos V2 (FR-DATA-003)
4. Decoradores de tenant context en los 25 controllers (FR-AUTHZ-002)
5. eslint-plugin-guiders-security (FR-CI-002) — 1.5-2 días
6. test/security/endpoint-protections.spec.ts (FR-CI-001) — 2-3 días (25 controllers)
7. Redis adapter WS + Redis rate limiter (DA-SEC-05, DA-SEC-06)
8. Backoff exponencial en auth endpoints (FR-AUTH-005)
9. GDPR erasure endpoint (FR-GDPR-003)
10. Audit log interceptor (FR-OBS-006)
11. Infra: Dockerfile LTS non-root + GH Actions OIDC (FR-INFRA-001, FR-INFRA-002, FR-INFRA-003)
12. Keycloak configuración producción (FR-INFRA-004)
```

---

## 8. Métricas Prometheus Obligatorias (NFR-OBS-002)

```typescript
// src/context/shared/infrastructure/metrics/security.metrics.ts
export const SECURITY_METRICS = {
  authFailureTotal: new Counter({
    name: 'auth_failure_total',
    help: 'Total de fallos de autenticación',
    labelNames: ['reason', 'endpoint'],
  }),
  tenantIsolationViolationTotal: new Counter({
    name: 'tenant_isolation_violation_total',
    help: 'Intentos de acceso cross-tenant bloqueados',
    labelNames: ['controller', 'action'],
  }),
  rateLimitBlockedTotal: new Counter({
    name: 'rate_limit_blocked_total',
    help: 'Requests bloqueadas por rate limiting',
    labelNames: ['endpoint', 'reason'],
  }),
  auditWriteFailureTotal: new Counter({
    name: 'audit_write_failure_total',
    help: 'Fallos al escribir en audit log',
  }),
};

// Alertas Grafana obligatorias:
// - auth_failure_total > 50/min sostenido 5min → page
// - tenant_isolation_violation_total > 0 (cualquier) → page
// - audit_write_failure_total > 0 → ticket automático
```

---

## 9. Reglas de Enforcement para Agentes IA

Los agentes que implementen stories de este programa **DEBEN:**

- Extender `BaseTenantAwareRepository` en todo repositorio V2 multi-tenant — nunca llamar `model.findOne()` directamente
- Declarar exactamente uno de `@RequireTenantContext | @OptionalTenantContext | @NoTenantContext` en cada controller
- Usar `buildRoomName()` para construir nombres de sala en WebSocket — nunca template literals directos
- Añadir `companyId: { type: String, required: true, index: true }` en todo schema Mongo de entidad multi-tenant nueva
- Usar `EncryptionService` (AES-256-GCM) para todo campo PII o secreto en reposo
- Añadir isolation test en `test/security/tenant-isolation/<aggregate>.isolation.spec.ts` para cada nuevo aggregate V2
- Declarar cada nuevo endpoint en `security-contracts/endpoint-protections.yaml` — sin excepción

Los agentes **NO DEBEN:**

- Usar `console.log/error/warn` — solo `this.logger` (NestJS Logger)
- Logguear valores de JWT, API keys, passwords, claves RSA — usar `[REDACTED]`
- Construir room names WS con template literals sin pasar por `buildRoomName()`
- Omitir `commit()` después de `mergeObjectContext()` + `save()`
- Crear un endpoint nuevo sin actualizar `security-contracts/endpoint-protections.yaml`
- Usar `jwt.verify()` sin `algorithms` whitelist explícita
- Instanciar `crypto.createCipheriv('aes-256-cbc', ...)` — usar `EncryptionService`

---

## 10. Trazabilidad FR → Decisión Arquitectónica

| FR | DA que lo implementa |
|---|---|
| FR-AUTH-001…FR-AUTH-004, FR-AUTH-006, FR-AUTH-013 | DA-SEC-03 |
| FR-AUTH-005 | DA-SEC-06 |
| FR-AUTH-007, FR-AUTH-008, FR-AUTH-009, FR-AUTH-010 | DA-SEC-04 |
| FR-AUTH-011, FR-AUTH-012 | DA-SEC-03 |
| FR-AUTHZ-001, FR-AUTHZ-006 | DA-SEC-01 |
| FR-AUTHZ-002, FR-AUTHZ-003, FR-AUTHZ-004, FR-AUTHZ-005 | DA-SEC-01, DA-SEC-02 |
| FR-API-001, FR-API-002, FR-API-004, FR-API-006 | DA-SEC-10 |
| FR-API-003 | DA-SEC-06 |
| FR-API-005, FR-API-007, FR-API-008, FR-API-009 | DA-SEC-08 (validation pipe) / DA-SEC-04 (api keys) |
| FR-INJ-001…FR-INJ-005 | DA-SEC-08 |
| FR-DATA-001…FR-DATA-005 | DA-SEC-02 |
| FR-DATA-006 | DA-SEC-04 |
| FR-WS-001…FR-WS-005 | DA-SEC-05 |
| FR-OBS-001…FR-OBS-006 | DA-SEC-07 |
| FR-INFRA-001…FR-INFRA-007 | DA-SEC-10, DA-SEC-11 |
| FR-GDPR-001…FR-GDPR-005 | DA-SEC-09 |
| FR-CI-001…FR-CI-009 | DA-SEC-10 |
| FR-RISK-001…FR-RISK-004 | DA-SEC-10 |

---

## 11. Validación de Arquitectura

### Coherencia entre decisiones

| Dependencia | Estado |
|---|---|
| DA-SEC-01 (guards) depende de `endpoint-roles-audit.md` | Prerrequisito documentado — bloqueante antes de Sprint 1 día 1 |
| DA-SEC-02 (isolation) depende de DA-SEC-01 (TenantContextGuard) | Secuencia correcta: guard primero, repos después |
| DA-SEC-05 (WS Redis) y DA-SEC-06 (rate limit Redis) comparten instancia | Una sola conexión Redis, namespaces distintos — sin conflicto |
| DA-SEC-04 (AES-GCM) modifica `EncryptionService` que usa DA-02 de architecture.md (leadcarsApiKey) | Ambas usan el mismo servicio → migración AES-GCM aplica automáticamente a leadcarsApiKey |
| DA-SEC-07 (audit log) es asíncrono fire-and-forget | No introduce latencia en requests — NFR-PERF-001 respetado |

### Cobertura de FRs

- **68 FRs del security PRD:** todos tienen al menos una DA que los implementa ✅
- **40 hallazgos P0:** cubiertos en DA-SEC-01, DA-SEC-02, DA-SEC-03, DA-SEC-04, DA-SEC-07, DA-SEC-08 ✅
- **60 hallazgos P1:** distribuidos en DA-SEC-01 a DA-SEC-11 ✅
- **NFRs:** NFR-PERF (audit async, Redis cache), NFR-AVAIL (Redis fail-open documentado), NFR-OBS (Prometheus métricas), NFR-COMP (erasure + audit inmutables) ✅

### Checklist de completitud

- [x] Decisiones críticas documentadas (DA-SEC-01 a DA-SEC-11)
- [x] Patrones de implementación con código de referencia
- [x] Estructura de archivos nuevos y modificados
- [x] Secuencia de implementación por sprint con dependencias
- [x] Contratos de seguridad (YAML, runbooks)
- [x] Variables de entorno nuevas y eliminadas
- [x] Métricas Prometheus y alertas
- [x] Reglas de enforcement para agentes IA
- [x] Trazabilidad FR → DA completa
- [x] Redis SPOF documentado como risk acceptance formal
- [x] Runbook AES-GCM con fases temporales explícitas
- [x] Prerrequisito `endpoint-roles-audit.md` documentado como bloqueante

### Resultado: LISTA PARA IMPLEMENTACIÓN ✅

Todas las decisiones son coherentes entre sí, cubren el scope completo del security PRD, y proporcionan suficiente detalle para que los agentes IA (Amelia, Quinn) implementen de forma consistente sin ambigüedad.
