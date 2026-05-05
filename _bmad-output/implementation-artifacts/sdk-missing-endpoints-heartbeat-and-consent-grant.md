---
title: 'SDK Missing Endpoint: Heartbeat de sesión de visitante'
type: 'feature'
created: '2026-05-05'
status: 'done'
baseline_commit: '908ce62fe9a9974b047d8e8b0ef4a4234f686213'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El SDK de Guiders (v1.6.0) llama en producción a `POST /api/visitors/session/heartbeat` cada 30 segundos para mantener viva la sesión del visitante, pero este endpoint no existe en el backend ni en la especificación OpenAPI. Sin él, la sesión del visitante expira prematuramente en Redis y el visitante pierde su contexto de chat.

**Approach:** Implementar el endpoint de heartbeat como una acción ligera que actualiza la actividad del visitante en Redis vía `VisitorConnectionDomainService.updateLastActivity()`, sin tocar el aggregate ni emitir eventos de dominio. Añadir la entrada correspondiente en `docs/api/openapi.yaml`. El endpoint `POST /api/consents/grant` queda diferido — el flujo `identify → renew` cubre todos los casos de uso actuales.

## Boundaries & Constraints

**Always:**
- Resolver el sessionId con `resolveVisitorSessionId(req, dto.sessionId)` (prioridad: body → header → cookie).
- Buscar el visitante en MongoDB por sessionId antes de actualizar Redis — la sesión debe existir y ser válida.
- Si el visitante no se encuentra por sessionId: responder `401 Unauthorized`. El 401 es semánticamente correcto, permite observabilidad de sesiones expiradas en logs, y el SDK ya lo maneja como fallo silencioso sin romper el cliente.
- El heartbeat no debe emitir eventos de dominio ni persistir en MongoDB — solo actualiza Redis.
- Añadir `@PublicEndpoint()` (igual que `session/end`).
- Registrar el endpoint en `docs/api/openapi.yaml`.

**Ask First:**
- Si se detecta que `VisitorV2Repository` no expone un método `findBySessionId`, consultar antes de añadirlo o usar alternativa existente.

**Never:**
- No modificar el aggregate `VisitorV2` ni crear nuevos comandos de dominio.
- No cambiar la lógica del TTL en Redis (permanece en 600s).
- No implementar `POST /api/consents/grant` en este spec — queda diferido al backlog.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Heartbeat válido | `x-guiders-sid` válido, visitante activo en MongoDB | `200 OK` — TTL `visitor:activity:{id}` en Redis renovado a 600s | — |
| Sesión expirada o inexistente | `sessionId` no encontrado en MongoDB | `401 Unauthorized` | SDK hace `debugWarn` silencioso, no interrumpe al visitante |
| Sin sessionId | No hay header, cookie ni body con sessionId | `400 Bad Request` | — |
| `activityType` omitido | Body sin `activityType` | `200 OK` — se trata como `heartbeat` por defecto | — |

</frozen-after-approval>

## Code Map

- `src/context/visitors-v2/infrastructure/controllers/visitor-v2.controller.ts` — añadir `POST session/heartbeat`
- `src/context/visitors-v2/infrastructure/http/visitor-session-cookie.util.ts` — `resolveVisitorSessionId()` para extraer sessionId
- `src/context/visitors-v2/domain/visitor-connection.domain-service.ts` — interfaz con `updateLastActivity(visitorId, lastActivity)`
- `src/context/visitors-v2/infrastructure/connection/redis-visitor-connection.domain-service.ts` — implementación Redis (TTL 600s, clave `visitor:activity:{id}`)
- `src/context/visitors-v2/infrastructure/persistence/` — repositorio para buscar visitante por sessionId
- `src/context/visitors-v2/application/dtos/` — crear `HeartbeatDto`
- `docs/api/openapi.yaml` — añadir entrada `POST /api/visitors/session/heartbeat`

## Tasks & Acceptance

**Execution:**
- [x] `src/context/visitors-v2/application/dtos/heartbeat.dto.ts` -- CREAR DTO con `sessionId?: string` y `activityType?: 'heartbeat' | 'user-interaction'` anotado con `@ApiPropertyOptional` -- formaliza el contrato de entrada del endpoint
- [x] `src/context/visitors-v2/infrastructure/controllers/visitor-v2.controller.ts` -- AÑADIR `@Post('session/heartbeat')` con `@PublicEndpoint()`, `@HttpCode(200)` -- resuelve sessionId, busca visitante por sessionId (401 si no existe), llama `updateLastActivity()` con timestamp actual, retorna `{ success: true, message: 'Sesión renovada' }`
- [x] `docs/api/openapi.yaml` -- AÑADIR entrada `POST /api/visitors/session/heartbeat` con el schema de request (`sessionId` required, `activityType` optional enum) y responses `200` / `400` / `401`, bajo el tag `visitors`

**Acceptance Criteria:**
- Dado un `x-guiders-sid` válido con visitante activo, cuando se llama `POST /api/visitors/session/heartbeat`, entonces responde `200 OK` y la clave `visitor:activity:{visitorId}` en Redis tiene TTL renovado a ~600s.
- Dado un sessionId expirado o inexistente, cuando se llama al heartbeat, entonces responde `401 Unauthorized`.
- Dado que no se proporciona sessionId por ninguna vía, cuando se llama al heartbeat, entonces responde `400 Bad Request`.
- Dado que el endpoint se añade al spec OpenAPI, cuando se revisa `docs/api/openapi.yaml`, entonces el path `/api/visitors/session/heartbeat` existe con schemas de request y respuestas correctos.

## Spec Change Log

## Design Notes

El heartbeat no pasa por el `CommandBus` — inyecta directamente `VISITOR_CONNECTION_DOMAIN_SERVICE` y el repositorio de visitantes en el controller o en un servicio de aplicación ligero. Esto evita el overhead del bus CQRS para una operación que ocurre cada 30 segundos por visitante activo.

El `activityType` está en el body por compatibilidad con el contrato del SDK, pero el backend lo ignora en esta primera versión — `updateLastActivity` siempre actualiza con `VisitorLastActivity.now()`. Si en el futuro se necesita distinguir heartbeat de interacción real, existe `updateLastUserActivity` (clave `visitor:user-activity:`) como segunda vía.

**Decisión diferida — `POST /api/consents/grant`:** El `RecordConsentCommand` ya existe a nivel de aplicación. El endpoint no se implementa porque el flujo `identify → renew` cubre todos los casos actuales. Si el producto necesita granularidad post-identificación (ej. banner de cookies por categoría), se abre una historia específica con caso de uso claro.

## Suggested Review Order

**Contrato del endpoint — lógica principal**

- Entrada del endpoint y resolución del sessionId (las tres vías: body, header, cookie)
  [`visitor-v2.controller.ts:307`](../../src/context/visitors-v2/infrastructure/controllers/visitor-v2.controller.ts#L307)

- Validación de sesión en MongoDB y respuestas 400/401/500 diferenciadas
  [`visitor-v2.controller.ts:317`](../../src/context/visitors-v2/infrastructure/controllers/visitor-v2.controller.ts#L317)

- Actualización de TTL en Redis con manejo explícito de error de infraestructura
  [`visitor-v2.controller.ts:338`](../../src/context/visitors-v2/infrastructure/controllers/visitor-v2.controller.ts#L338)

**Inyección de dependencias en el controller**

- Nuevas dependencias inyectadas: repositorio y servicio Redis, sin pasar por CommandBus
  [`visitor-v2.controller.ts:72`](../../src/context/visitors-v2/infrastructure/controllers/visitor-v2.controller.ts#L72)

**DTO de entrada**

- Contrato de entrada: sessionId opcional + activityType (ignorado en v1, reservado para futura diferenciación)
  [`heartbeat.dto.ts:1`](../../src/context/visitors-v2/application/dtos/heartbeat.dto.ts#L1)

**Especificación OpenAPI**

- Nuevo path `/api/visitors/session/heartbeat` con request body, header y responses 200/400/401
  [`openapi.yaml:1144`](../../docs/api/openapi.yaml#L1144)

- Schema `HeartbeatDto` añadido a components/schemas
  [`openapi.yaml:6268`](../../docs/api/openapi.yaml#L6268)

## Verification


**Commands:**
- `npm run lint` -- expected: 0 errores
- `npm run test:unit` -- expected: todos los tests pasan
- `npm run build` -- expected: compilación exitosa sin errores TypeScript
