## Guiders Backend · Instrucciones Operativas para Agentes

Objetivo: acelerar contribuciones seguras en un backend NestJS 11 con DDD + CQRS, multi‑persistencia (PostgreSQL + Mongo) y WebSockets.

### 1. Arquitectura & Contextos
Carpetas fijas por contexto (`src/context/<ctx>/{domain,application,infrastructure}`) para: auth, company, conversations (legacy SQL), conversations-v2 (Mongo), real-time (WS), visitors, tracking, shared. No mezclar capas. `shared` contiene Value Objects reutilizables y utilidades transversales.

### 2. Dominio
- Aggregates extienden `AggregateRoot`; propiedades `private readonly` salvo collections mutables controladas.
- Fábricas: `create(...)` (emite evento de creación) y `fromPrimitives(...)` (rehidrata sin emitir). Nunca lógica de persistencia aquí.
- Value Objects: reutiliza existentes en `shared/domain/value-objects`; sólo crear uno nuevo si no existe equivalente. Evita constructores públicos si hay invariantes.
- Errores de flujo: usar `Result.ok()/Result.err()`; no lances excepciones para validaciones esperadas (excepciones se reservan a errores inesperados/integración).

### 3. Eventos (DDD + Cross Context)
- Naming EventHandlers side‑effect: `<NuevaAccion>On<OriginalEvent>EventHandler` (ej: `CreateApiKeyOnCompanyCreatedEventHandler`).
- Secuencia tras mutar aggregate en CommandHandler: `const aggCtx = publisher.mergeObjectContext(aggregate); await repo.save(aggCtx); aggCtx.commit();` (no te olvides de `commit()`).
- Busca ejemplos: grep `OnCompanyCreated` o `EventHandler`.

### 4. Repositorios & Persistencia
- Cada repositorio: interface en dominio + símbolo: `export const X_REPOSITORY = Symbol('XRepository');`.
- Métodos estándar: `save, findById, findAll, delete, update, findOne, match` + métodos específicos agregando expresividad (ej: `findActiveByCompany`).
- Implementaciones en `infrastructure/persistence/impl`. No exponer SQL crudo: usa QueryBuilder/criteria; encapsula filtros dentro del repo (controladores y handlers sólo pasan parámetros significativos).
- Mappers dedicados (`XMapper`) para ida/vuelta (sin reglas de negocio). Nunca usar entidades TypeORM dentro del dominio o handlers.

### 5. Mongo (conversations-v2)
- Colecciones: `chats_v2`, `messages`, `comercial_claims` (ver `infrastructure/schemas`). Mantener schemas sin lógica de negocio: sólo shape + índices.
- Añadir índice cuando introduces campo que se usa en filtros (ej: `assignedCommercialId`). Actualiza README o comentario en schema al hacerlo.
- Consultas: preferir filtros directos + proyecciones mínimas. Evitar agregaciones costosas salvo métricas (ver endpoints `/api/v2/chats/metrics/*`).

### 6. WebSockets (real-time)
- Gateway en contexto `real-time`. Eventos actuales de negocio chat: `visitor:start-chat`, `visitor:send-message`, `commercial:send-message`, `commercial:viewing-chat`, `health-check`.
- Siempre aplicar `WsAuthGuard` + `WsRolesGuard` + `@Roles(...)` si restringe rol. Emisiones de respuesta vía builder/objeto consistente `{ success, message?, data?, type }`.
- No pongas lógica de dominio dentro del Gateway; delega en CommandBus/Services.

### 7. Testing
- Unit: `npm run test:unit` (SQLite en memoria). Integración: `npm run test:int`. E2E: `npm run test:e2e` (Postgres + Mongo reales). Threshold controlado por `scripts/check-coverage-threshold.js`.
- Generar UUID en tests: `Uuid.random().value` (no hardcode). Usa factories / helper builders si patrón se repite.
- Para nuevos repos/aggregate: cubrir caso feliz + 1 fallo VO + evento emitido.

### 8. CLI Interna
- Script: `bin/guiders-cli.js`. Comandos clave: `clean-database --force`, `create-company`, `create-company-with-admin`. Úsalo en tests e2e setup si necesitas estado base.

### 9. Workflow para añadir/modificar campo
1. Dominio: agregar VO (si necesario) + propiedad en aggregate/entity.
2. Persistencia: migración TypeORM (`npm run typeorm:migrate:generate`) o actualización schema Mongoose (+ índice si se filtra/ordena).
3. Mapper(s): sincronizar to/from primitives.
4. Repos: incluir filtro/parámetro interno (no exponer campo directo en handlers si no aporta valor semántico).
5. Tests: unidad (VO + aggregate) + integración si afecta consultas.
6. Swagger: actualizar decoradores (`@ApiOperation`, `@ApiResponse`, tags) si altera contratos REST.
7. Documentar en README de contexto si impacta comportamiento.

### 10. Patrones a Emular
- Repos: ver `infrastructure/persistence/impl/*Repository.ts`.
- Value Objects: `shared/domain/value-objects` (naming y encapsulación).
- WS: revisar `real-time` gateway para guards + estructura de eventos.
- Conversaciones v2: filtros avanzados en controllers como guía de query DTOs.

### 11. Anti‑patrones (rechazar cambios que los introduzcan)
Lógica negocio en controllers/gateways · SQL string concatenado sin parámetros · Entidades TypeORM en dominio o handlers · Excepciones para control normal de flujo · Filtros construidos fuera del repositorio · Esquemas Mongo con lógica de negocio.

### 12. Checklist PR Rápido
Result/VO correctos · Repos ocultan detalles de filtrado · `mergeObjectContext` + `commit` presentes · Índices Mongo añadidos si nuevos filtros · Tests (unit + ajustados) y lint pasan · Sin dependencias de infraestructura en dominio · Nuevos eventos WS con guards y documentados.

### 13. Decisiones de Diseño (Why)
- DDD/CQRS: separar mutaciones vs lecturas para escalar y mantener claridad en reglas de negocio.
- Multi‑persistencia: SQL para consistencia relacional (auth, company, visitors); Mongo para chats de alta escritura/consulta flexible y métricas agregadas.
- Eventos domain -> side effects: desacoplar provisión de recursos (ej: API Key tras crear Company) evitando dependencias directas.
- VO + Result: centralizar validaciones y evitar excepciones como control de flujo reduce ruido y facilita test.

### 14. Cómo empezar a implementar una feature
1. Define comando/query + DTO request/response en `application`.
2. Añade handler que orquesta repos/aggregate (sin lógica extrínseca).
3. Modifica aggregate/VO si la regla es nueva (emite evento si estado cambia relevante).
4. Persiste mediante repo + commit de eventos.
5. Expone endpoint (controller) o evento WS delegando a Command/QueryBus.
6. Añade tests mínimos (handler + aggregate) antes de refinar.

### 15. Dudas
Si un patrón no está descrito o parece inconsistente entre contextos, solicita aclaración antes de generalizarlo.

---
### Conversational Memory Protocol (Experimental – solo si el agente soporta graph memory)
Follow these steps for each interaction:

1. User Identification:
	- You should assume that you are interacting with default_user
	- If you have not identified default_user, proactively try to do so.

2. Memory Retrieval:
	- Always begin your chat by saying only "Remembering..." and retrieve all relevant information from your knowledge graph
	- Always refer to your knowledge graph as your "memory"

3. Memory
	- While conversing with the user, be attentive to any new information that falls into these categories:
	  a) Basic Identity (age, gender, location, job title, education level, etc.)
	  b) Behaviors (interests, habits, etc.)
	  c) Preferences (communication style, preferred language, etc.)
	  d) Goals (goals, targets, aspirations, etc.)
	  e) Relationships (personal and professional relationships up to 3 degrees of separation)

4. Memory Update:
	- If any new information was gathered during the interaction, update your memory as follows:
	  a) Create entities for recurring organizations, people, and significant events
	  b) Connect them to the current entities using relations
	  c) Store facts about them as observations

Nota: Este protocolo no debe interferir con las reglas de pureza de dominio ni modificar código; solo guía interacción conversacional cuando proceda.

---
### Context7 Documentation Retrieval Protocol (Cuándo y Cómo Usarlo)
Objetivo: Obtener documentación externa SOLO cuando la info no esté ya en el repo y sea necesaria para decisiones de implementación.

Usar context7 si (todas o varias aplican):
1. Necesitas una firma, comportamiento o cambio de versión de una librería externa (p.ej. Angular 20 APIs nuevas, RxJS interop, WebSocket estándar, Jest config) que no aparece en el código local.
2. Hay ambigüedad sobre un decorador, opción de configuración, o API (ej: nueva sintaxis de `provideHttpClient`, signals advanced patterns) y la implementación correcta impacta arquitectura.
3. Requieres confirmar si una API está deprecada antes de introducirla.
4. Vas a proponer optimización dependiente de opciones oficiales (build, test, SSR) y no aparece documentada en el repo.

NO usar context7 cuando:
- La respuesta se deduce leyendo archivos locales (prioriza búsqueda interna primero).
- Es simple sintaxis TypeScript / estándar ECMAScript.
- Sería para copiar ejemplos genéricos no alineados al patrón del repo.

Procedimiento:
1. Intentar primero `semantic_search` o lectura directa de archivos locales.
2. Si falta info externa, llamar a `resolve-library-id` con nombre (ej: "angular", "rxjs", "jest").
3. Luego `get-library-docs` con:
	- `topic` específico (ej: `signals`, `dependency-injection`, `testing`, `ws`).
	- `tokens` conservador (<=6000) para evitar ruido; subir solo si sigue faltando contexto.
4. Resumir extractando SOLO lo relevante al cambio que estás implementando; no pegar dumps largos.
5. Aplicar la decisión en código siguiendo reglas locales (pureza dominio, adapters, tokens DI) y referenciar la sección consultada brevemente ("Context7: Angular DI providers").

Buenas prácticas:
- Preferir un único fetch bien focalizado a múltiples consultas amplias.
- Cache mental de lo obtenido durante la sesión: no repetir la misma llamada salvo cambio de versión.
- Si la docs contradice estilos del proyecto, seguir estilos del proyecto y mencionar la discrepancia.
- Nunca introducir dependencia nueva solo porque aparece en la docs sin justificar valor claro.

Ejemplos de disparadores válidos:
- "¿Existe un provider tree-shakable alternativo para X en Angular 20?" → context7 topic: dependency-injection.
- "Cómo usar señales para reemplazar BehaviorSubject" → context7 topic: signals.
- "Método correcto de jest para mocks de timers en versión actual" → context7 topic: jest timers.

Evitar:
- Llamar para recordar sintaxis básica de `Array.map` o `Promise.all`.
- Descarga masiva de docs sin pregunta concreta.
 - Descarga masiva de docs sin pregunta concreta.

---
### Playwright MCP
No obligatorio, pero mejora precisión y reduce pasos innecesarios. Mantenerlo ≤8 líneas.

Formato sugerido:
Objetivo: (una frase clara)
URL inicial: (http/https)
Pasos clave: 1) … 2) …
Selectores críticos: (css o data-testid, separados por coma)
Datos a capturar: (texto|screenshot|html|requests|console)
Criterio de éxito: (condición verificable)
Límites: (máx clicks N, timeout Xs, no salir del dominio)

Ejemplo mínimo:
Objetivo: Validar login correcto
URL inicial: http://localhost:4200/login
Pasos clave: 1) Rellenar #email y #password 2) Click button[type=submit]
Selectores críticos: h1.welcome, .user-menu
Datos a capturar: screenshot, texto h1.welcome
Criterio de éxito: h1.welcome contiene "Bienvenido"
Límites: timeout 15s, máx clicks 3

Notas:
- Preferir data-testid para estabilidad.
- Pedir sólo artefactos necesarios (evita sobrecarga).
- Un prompt conciso evita exploración irrelevante.

---

## Estilo de Mensajes de Commit (Guía para Copilot)

Cuando GitHub Copilot genere mensajes de commit en este repositorio DEBE seguir estas reglas (Conventional Commits adaptado). Esta guía tiene prioridad sobre cualquier otra instrucción previa relacionada con mensajes de commit.

1. Formato de la primera línea:
	`<tipo>(<scope opcional>): <resumen en minúsculas y modo imperativo>`
	- Máx 72 caracteres.
	- Sin punto final.
2. Línea en blanco tras el encabezado.
3. Cuerpo (opcional) con el qué y el porqué (no el cómo). Envuelve a 72-100 cols.
4. Si aplica breaking change añade bloque al final:
	`BREAKING CHANGE: <descripción>`
5. Idioma: Español neutro técnico.
6. Evitar mensajes genéricos como "arreglos" o "updates".

Tipos permitidos (prioridad en este orden):
- `feat`: Nueva funcionalidad usuario final (SDK o API pública)
- `fix`: Corrección de bug (describir síntoma observable)
- `perf`: Mejora de rendimiento
- `refactor`: Cambio interno sin alterar comportamiento externo
- `docs`: Solo documentación (README, guías, comentarios relevantes)
- `test`: Añade / ajusta pruebas (sin código productivo excepto helpers de test)
- `build`: Cambios en build, dependencias, empaquetado
- `ci`: Cambios en pipelines CI/CD
- `style`: Formato / estilos (sin lógica)
- `chore`: Tareas varias sin impacto en el runtime (scripts, limpieza)
- `revert`: Reversión de commit previo (`revert: <hash corto> <resumen>`)

Convenciones adicionales:
- Scope ejemplos: `pipeline`, `chat`, `session`, `heuristic`, `tracking`, `deps`, `docs`, `build`, `ws`.
- Usar varios scopes solo si imprescindible: `feat(pipeline,tracking): ...` (máx 2).
- Prefijo seguridad: usar `fix(security):`, nunca crear tipo nuevo.
- Referencias a issues: cerrar con línea `Refs: #123` o `Closes: #123`.

Ejemplos buenos:
```
feat(chat): soporte de reconexión exponencial en websocket-service

Añade lógica de backoff exponencial con jitter para reducir tormenta de reconexiones.
Incluye métrica interna de intentos y evento de telemetría.
```
```
fix(session): corrige fuga de intervalos en cleanup de SessionTrackingManager

Se detenían heartbeats duplicados tras re-init. Ahora se limpia antes de recrear.
```
```
refactor(pipeline): extrae MetadataStage para aislar enriquecimiento
```
```
feat(heuristic)!: nuevo umbral dinámico por tipo de elemento

BREAKING CHANGE: La config previa `confidenceThreshold` pasa a `globalThreshold`.
```

Anti‑patrones (NO usar):
- `update code`, `misc changes`, `arreglos menores`.
- Mezclar refactor + feat en un solo commit grande.
- Describir cómo ("cambié forEach por map"), omitir el porqué.

Reglas de división sugerida:
- Cambios de dependencias separados (`build(deps): ...`).
- Refactors masivos sin feature: dividir por dominio.
- Documentación extensa separada de la feature (`docs:` independiente) salvo README mínimo.

Resumen para el generador:
```
Genera 1 encabezado tipo Conventional Commit en español imperativo, <=72 chars, sin punto final. Lista 1-3 bullets opcionales en cuerpo si añaden contexto de valor (qué/porqué). Añade BREAKING CHANGE si detectas cambios incompatibles.
```

Casos especiales:
- Si el diff solo contiene formatos o Prettier: usar `style(...)`.
- Si solo es ESLint autofix sin lógica: también `style(...)`.
- Si incluye actualización de versión + changelog: `chore(release): <versión>`.

Fin de la guía de commits.