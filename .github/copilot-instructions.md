## Guiders Backend · Instrucciones Clave para Agentes

Objetivo: cambios seguros y rápidos en backend NestJS 11 con DDD + CQRS, multi‑persistencia (PostgreSQL + Mongo) y WebSockets.

### 1. Estructura & Fronteras
`src/context/<ctx>/{domain,application,infrastructure}`. Contextos: auth, company, conversations (V1 SQL legacy), conversations-v2 (Mongo), real-time, visitors, tracking, shared. Reglas de dependencia: domain ⇒ (nada interno), application ⇒ domain, infrastructure ⇒ application/domain. Nunca importar infraestructura dentro de dominio. `shared` contiene value objects, `Result`, criteria/utilidades.

### 2. Modelado de Dominio
Aggregates = clases que extienden `AggregateRoot`, campos `private readonly`. Fábricas: `create()` (emite evento) vs `fromPrimitives()` (rehidrata sin eventos). Reutiliza VO existentes en `shared/domain/value-objects` antes de crear nuevos. Validaciones esperadas devuelven `Result.failure`, evita lanzar excepciones salvo casos realmente excepcionales.

### 3. Eventos de Dominio
Handler side‑effect: `<AccionNueva>On<OriginalEvent>EventHandler` (ej: `CreateApiKeyOnCompanyCreatedEventHandler`). Publicación correcta en command handler: `const aggCtx = publisher.mergeObjectContext(agg); await repo.save(aggCtx); aggCtx.commit();` (sin `commit()` no se despacha el evento). Nuevos eventos en `domain/events`, no en infraestructura.

### 4. Persistencia & Repositorios
En dominio: interface + símbolo `export const X_REPOSITORY = Symbol('XRepository');`. Métodos base: `save, findById, findAll, delete, update, findOne, match` + semánticos. Infraestructura implementa en `infrastructure/persistence/impl`. Usar mappers dominio↔persistencia (nunca retornar entidades TypeORM/Mongoose fuera). Filtros complejos encapsulados (no reconstruir en controllers/gateways). En Mongo usar proyecciones para minimizar carga.

### 5. Multi‑Persistencia & Versiones de Chat
PostgreSQL (TypeORM) para auth/company/visitors/tracking/conversations (V1). Mongo (Mongoose) para conversations-v2 (alto volumen + métricas). Al añadir campo: (1) VO/aggregate (2) migración SQL o schema + índice Mongo (3) mapper (4) repo (5) tests (unit + int si afecta queries) (6) actualizar README + Swagger si cambia contrato. Preferir V2 para nuevas features de chat; V1 sólo mantenimiento.

### 6. Real-Time (WebSockets)
Gateway en `real-time/infrastructure/...`. Siempre guards: `WsAuthGuard`, `WsRolesGuard` + `@Roles`. Gateway = orquestador: delega a CommandBus/QueryBus/servicios. Respuestas uniformes `{ success, type, data?, message? }`. No lógica de dominio ni queries manuales dentro del gateway.

### 7. Conversations V2 (Mongo) Notas
Colecciones: `chats_v2`, `messages`, `comercial_claims`. Índices compuestos en campos filtrados (`assignedCommercialId+status`, fechas). Operaciones pesadas (agregaciones) solo en endpoints `/api/v2/chats/metrics/*`. Controladores aceptan filtros; no replicar lógica de parseo en otras capas.

### 8. Testing & Calidad
Unit (`npm run test:unit`) usa SQLite en memoria. Integración (`npm run test:int`) y E2E (`npm run test:e2e`) levantan Postgres + Mongo. Cobertura verificada por `scripts/check-coverage-threshold.js`. Patrón tests nuevo aggregate: caso éxito + VO inválido + evento emitido. Usar generadores (`Uuid.random().value` o equivalentes) para IDs. Ejecutar `npm run lint` y `npm run format` antes de PR.

### 9. CLI Interna
`bin/guiders-cli.js`: `clean-database --force`, `create-company`, `create-company-with-admin`. Útil para preparar datos en E2E o reproducir escenarios.

### 10. Anti‑Patrones (bloquear)
Lógica de negocio en controllers/gateways; excepciones para flujo validable; concatenar SQL manual; exponer entidades ORM/Mongoose; duplicar filtros fuera del repo; lógica en schemas Mongo; olvidar `commit()`; mezclar concerns dominio<->infraestructura.

### 11. Checklist PR Express
[] VO/Result aplicados correctamente
[] Eventos publicados con `mergeObjectContext` + `commit()`
[] Repos esconden detalles de filtrado / devuelven dominio puro
[] Migración o índice creado si campo nuevo filtrable
[] Tests (unit + int/E2E si procede) verdes y cobertura ok
[] Lint/format ok
[] Swagger + README(s) actualizados si cambia contrato

### 12. Decisiones Clave (Why)
Mongo para chats (latencia + agregaciones); separación CQRS para optimizar reads/writes; eventos desacoplan side‑effects (ej: API Key tras CompanyCreated); VO + Result centralizan invariantes reduciendo ruido.

### 13. Flujo Rápido de Nueva Feature
1. Definir Command/Query + DTO. 2. Implementar handler orquestando repos + dominio. 3. Ajustar aggregate/VO y emitir evento si aplica. 4. Persistir + `commit()`. 5. Exponer vía controller o WS. 6. Añadir tests mínimos. 7. Actualizar docs si cambia contrato.

¿Algo poco claro o falta un patrón? Pide aclaración antes de introducir uno nuevo.

---
### Context7 (cuándo leer docs externas)
Usar solo si falta en repo y afecta decisión (APIs Angular 20, signals avanzados, DI tree-shakable, Jest timers). Proceso: buscar local → si falta `resolve-library-id` → `get-library-docs(topic)` tokens ≤6000 → resumir y aplicar citando ("Context7: signals"). No para sintaxis básica.

### Playwright MCP
Mantener prompts concisos (≤8 líneas). Incluir: Objetivo, URL inicial, pasos clave, selectores críticos, datos a capturar, criterio de éxito, límites.