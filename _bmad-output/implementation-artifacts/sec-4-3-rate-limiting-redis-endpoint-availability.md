# Story sec-4.3: Rate Limiting con Redis en POST /availability

Status: backlog

## Story

Como sistema de seguridad,
quiero que el endpoint `POST /availability` tenga rate limiting basado en Redis compartido,
para prevenir enumeración de dominios y abuso de la API pública sin bloquear usuarios legítimos.

## Contexto

Esta historia nace como deferred item del code review de sec-3.2 (2026-05-07).
El fix D2 (homogeneización de respuestas a 403) ya previene la **enumeración pasiva** de dominios.
Esta historia añade la capa de **protección activa** contra escaneo automatizado:
rate limiting con Redis compartido (funciona con múltiples réplicas) y backoff informativo via `Retry-After`.

Referencia: `deferred-work.md` → "D2b — Rate limiting con Redis en /availability".
Epic padre: sec-Epic 4 (Rate Limiting con Redis y Backoff Progresivo).
Prerequisito: sec-4.1 (Redis como store compartido para ThrottlerModule) debe estar completada o en paralelo.

## Acceptance Criteria

1. **Rate limiting por IP en /availability:**
   - **Given** una IP envía más de 20 peticiones a `POST /availability` en 1 minuto
   - **When** llega la petición 21
   - **Then** retorna **429 Too Many Requests** con header `Retry-After: <seconds>`

2. **Store Redis compartido (multi-réplica):**
   - **Given** dos réplicas del proceso Node corriendo en paralelo
   - **When** la misma IP distribuye 25 peticiones a cada réplica (50 total) en 1 minuto
   - **Then** las peticiones 41-50 son rechazadas con 429 — el contador se comparte vía Redis (`rl:availability:` namespace)

3. **Fail-open si Redis no disponible:**
   - **Given** Redis no está disponible
   - **When** el rate limiter intenta consultar el contador
   - **Then** la petición se permite (fail-open) y se emite log de warning `[RateLimiter] Redis unavailable — fail-open`

4. **Sin impacto en latencia nominal:**
   - **Given** Redis disponible y petición dentro del límite
   - **When** se procesa `POST /availability`
   - **Then** el overhead del rate limiter añade < 5ms (P99) a la latencia de la petición

5. **Tests:**
   - Test unitario: la petición 21 desde misma IP en ventana de 60s → 429
   - Test unitario: con Redis down → petición permitida (fail-open)
   - Test de integración: verificar headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` en respuesta 429

## Tasks / Subtasks

- [ ] Verificar que sec-4.1 (ThrottlerModule con Redis) está completada como prerequisito
- [ ] Aplicar `@Throttle({ default: { limit: 20, ttl: 60000 } })` al handler `checkCommercialAvailability`
- [ ] Configurar namespace Redis `rl:availability:` para segregar contadores
- [ ] Implementar fail-open: capturar `ThrottlerStorageError` y permitir petición con log de warning
- [ ] Añadir `@ApiResponse({ status: 429, description: 'Demasiadas peticiones. Ver header Retry-After.' })` en Swagger
- [ ] Tests unitarios (AC: #1, #3)
- [ ] Test de integración con Redis real (AC: #2, #4)

## Dev Notes

- El endpoint ya usa `@Public()` — el rate limiter debe funcionar sin JWT
- El store Redis debe ser la misma instancia que sec-4.1 (no añadir nueva conexión Redis)
- `ThrottlerStorageRedisService` de `@nestjs-throttler-storage-redis` — ya está en el plan de sec-4.1
- Namespace sugerido: `rl:availability:{ip}` (prefijo `rl:` consistente con sec-4.1)
- **No** añadir rate limiting por dominio (filtraría qué dominios existen) — solo por IP

## Deferred From

Code review de sec-3.2 (2026-05-07) — decisión D2b.
Ver `deferred-work.md` sección "Deferred from: code review of sec-3-2 (2026-05-07)".
