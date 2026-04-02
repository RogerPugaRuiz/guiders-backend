# Guiders Backend - Analisis del Arbol de Fuentes

**Fecha:** 2026-04-01

## Resumen

El proyecto es un monolito backend NestJS organizado siguiendo Domain-Driven Design (DDD) con arquitectura hexagonal. El codigo fuente reside en `src/context/`, donde cada bounded context sigue una estructura uniforme de tres capas: `domain/`, `application/`, `infrastructure/`. El proyecto contiene 15 contextos acotados, un gateway WebSocket centralizado, y 13 migraciones TypeORM.

---

## Estructura Completa del Directorio

```
guiders-backend/
├── src/                              # Codigo fuente principal
│   ├── main.ts                       # ★ Entry point - Bootstrap NestJS
│   ├── app.module.ts                 # Modulo raiz - importa todos los contextos
│   ├── app.controller.ts             # Health check (GET /)
│   ├── data-source.ts                # Configuracion TypeORM CLI
│   ├── context/                      # Bounded contexts (DDD)
│   │   ├── auth/                     # Autenticacion y autorizacion
│   │   │   ├── api-key/              # Gestion de API Keys (RSA 4096)
│   │   │   │   ├── domain/           # ApiKey entity, repository interface
│   │   │   │   ├── application/      # Use cases, DTOs, event handlers
│   │   │   │   └── infrastructure/   # TypeORM entity, controller, JWKS
│   │   │   ├── auth-user/            # Autenticacion de usuarios internos
│   │   │   │   ├── domain/           # Value objects, errors, events
│   │   │   │   ├── application/      # Commands, queries, services, usecases
│   │   │   │   └── infrastructure/   # Controllers, TypeORM, Keycloak strategies
│   │   │   ├── auth-visitor/         # Autenticacion de visitantes (widget)
│   │   │   │   ├── domain/           # Visitor auth models, repositories
│   │   │   │   ├── application/      # Use cases, services
│   │   │   │   └── infrastructure/   # Controller (/pixel), JWT visitor strategy
│   │   │   └── bff/                  # Backend-For-Frontend (OIDC/PKCE)
│   │   │       └── infrastructure/   # BFF controller, cookie service
│   │   ├── company/                  # Gestion de empresas y sitios
│   │   │   ├── domain/               # Company aggregate, Site VO, errors
│   │   │   ├── application/          # Commands, queries, DTOs
│   │   │   └── infrastructure/       # TypeORM entities, controllers
│   │   ├── shared/                   # Utilidades compartidas
│   │   │   ├── domain/               # Result<T,E>, AggregateRoot, Value Objects
│   │   │   │   ├── criteria/         # Criteria pattern (type-safe queries)
│   │   │   │   ├── value-objects/    # Uuid, Email, NonEmptyString, etc.
│   │   │   │   └── entities/         # AggregateRoot base class
│   │   │   └── infrastructure/       # Guards, modules, events, email, schedulers
│   │   ├── conversations-v2/         # ★ Sistema de chat en tiempo real (MongoDB)
│   │   │   ├── domain/               # Chat aggregate, Message, assignment rules
│   │   │   │   ├── entities/         # ChatAggregate, MessageAggregate
│   │   │   │   ├── services/         # ChatAssignmentService
│   │   │   │   ├── value-objects/    # ChatId, ChatStatus, MessageType, etc.
│   │   │   │   ├── events/           # ChatCreated, MessageSent, ChatClosed
│   │   │   │   └── errors/           # ChatNotFound, InvalidChatStatus, etc.
│   │   │   ├── application/          # CQRS handlers
│   │   │   │   ├── commands/         # CreateChat, SendMessage, AssignChat, etc.
│   │   │   │   ├── queries/          # GetChat, ListChats, SearchMessages, etc.
│   │   │   │   ├── events/           # NotifyOnChatCreated, UpdateUnreadCount
│   │   │   │   └── dtos/             # Request/Response DTOs
│   │   │   └── infrastructure/       # Mongoose schemas, controllers, mappers
│   │   │       ├── controllers/      # chat-v2, message-v2, assignment-rules, presence
│   │   │       ├── schemas/          # chat.schema.ts, message.schema.ts
│   │   │       ├── persistence/      # MongoDB repository implementations
│   │   │       ├── mappers/          # Domain <-> Persistence mappers
│   │   │       └── services/         # ChatNotificationService, etc.
│   │   ├── visitors-v2/              # ★ Tracking de visitantes (MongoDB)
│   │   │   ├── domain/               # Visitor aggregate, Session, lifecycle
│   │   │   │   ├── entities/         # VisitorV2Aggregate (state machine)
│   │   │   │   ├── value-objects/    # VisitorLifecycle, ConnectionStatus, etc.
│   │   │   │   ├── events/           # VisitorIdentified, SessionStarted
│   │   │   │   └── errors/           # VisitorNotFound, InvalidTransition
│   │   │   ├── application/          # Commands, queries, event handlers
│   │   │   └── infrastructure/       # Controllers, MongoDB entity, Redis
│   │   │       ├── controllers/      # visitor-v2, tenant-visitors, sites, site-visitors
│   │   │       ├── persistence/      # MongoDB repo impl + mappers
│   │   │       └── connection/       # Redis connection manager
│   │   ├── tracking-v2/              # ★ Ingestion de eventos (MongoDB particionado)
│   │   │   ├── domain/               # TrackingEvent aggregate, buffer service
│   │   │   ├── application/          # Commands (ingest), queries (stats)
│   │   │   └── infrastructure/       # Monthly-partitioned collections, scheduler
│   │   │       ├── persistence/      # Dynamic collection factory, buffer flush
│   │   │       ├── controllers/      # POST /tracking-v2/events
│   │   │       └── schedulers/       # Buffer flush scheduler
│   │   ├── commercial/               # Gestion de agentes comerciales
│   │   │   ├── domain/               # Commercial aggregate, status, fingerprint
│   │   │   ├── application/          # Connect, disconnect, status commands
│   │   │   └── infrastructure/       # MongoDB schema, Redis presence, scheduler
│   │   ├── leads/                    # Gestion de leads y CRM sync
│   │   │   ├── domain/               # Lead events, CRM integration services
│   │   │   ├── application/          # Sync commands, contact data, event handlers
│   │   │   └── infrastructure/       # LeadCars adapter, MongoDB schemas, controllers
│   │   │       └── adapters/leadcars/ # Cliente HTTP para API LeadCars
│   │   ├── llm/                      # ★ Integracion IA (Groq SDK)
│   │   │   ├── domain/               # LLM services, tool definitions, errors
│   │   │   ├── application/          # Suggestion commands, config management
│   │   │   └── infrastructure/       # Groq client, MongoDB schemas, controllers
│   │   ├── lead-scoring/             # Scoring de visitantes (calculo puro)
│   │   │   ├── domain/               # Scoring rules, tier definitions
│   │   │   └── application/          # ScoringService (hot/warm/cold)
│   │   ├── consent/                  # Gestion de consentimiento RGPD
│   │   │   ├── domain/               # Consent aggregate, audit log, version config
│   │   │   ├── application/          # Grant, revoke, renew commands
│   │   │   └── infrastructure/       # MongoDB entities (audit immutable), controllers
│   │   ├── white-label/              # Personalizacion de marca
│   │   │   ├── domain/               # WhiteLabelConfig entity, errors
│   │   │   └── infrastructure/       # S3 upload, MongoDB schema, controllers
│   │   ├── conversations/            # ⚠️ Legacy V1 (PostgreSQL, deprecado)
│   │   │   └── chat/infrastructure/  # Controlador vacio
│   │   └── visitors/                 # ⚠️ Legacy V1 (PostgreSQL, deprecado)
│   │       ├── domain/               # Visitor entity legacy
│   │       ├── application/          # Commands, queries legacy
│   │       └── infrastructure/       # TypeORM entity, controllers
│   ├── websocket/                    # ★ Gateway WebSocket centralizado
│   │   ├── websocket.gateway.ts      # Socket.IO gateway (13 eventos)
│   │   ├── websocket.module.ts       # Modulo WebSocket
│   │   └── __tests__/                # Tests del gateway
│   ├── migrations/                   # Migraciones TypeORM (PostgreSQL)
│   │   └── *.ts                      # 13 archivos de migracion
│   └── scripts/                      # Scripts utilitarios
├── bin/                              # CLI tools
│   └── guiders-cli.js               # CLI: create-company, clean-database
├── test/                             # Tests E2E
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── docs/                             # ★ Documentacion generada y manual
├── .github/                          # GitHub config
│   ├── workflows/                    # CI/CD pipelines (3 workflows)
│   └── instructions/                 # Copilot context instructions
├── .claude/rules/                    # 21 architecture pattern rules
├── _bmad-output/                     # BMad planning artifacts
├── _bmad/                            # BMad configuration
├── .opencode/                        # OpenCode skills and config
│   └── skills/                       # BMad skill definitions
├── docker-compose.yml                # Servicios desarrollo (PG, Mongo, Redis, Keycloak)
├── docker-compose-staging.yml        # Servicios staging
├── docker-compose-prod.yml           # Servicios produccion
├── Dockerfile                        # Multi-stage build (node:20-alpine)
├── package.json                      # Dependencias y scripts NPM
├── tsconfig.json                     # TypeScript config (ES2021, strict)
├── eslint.config.mjs                 # ESLint flat config
├── nest-cli.json                     # NestJS CLI config
├── jest-unit.json                    # Configuracion Jest para tests unitarios
├── jest-int.json                     # Configuracion Jest para tests integracion
├── ecosystem.config.js               # PM2 config produccion
└── ecosystem.staging.config.js       # PM2 config staging
```

---

## Directorios Criticos

### `src/context/shared/`

**Proposito:** Utilidades compartidas por todos los bounded contexts.
**Contiene:** Result pattern (`ok/err/okVoid`), AggregateRoot base class, Value Objects (Uuid, Email, NonEmptyString, Timestamp), Criteria pattern para consultas type-safe, Guards de autenticacion, modulos de infraestructura compartida (email, eventos, schedulers).
**Dependencia:** Todos los contextos importan de `src/context/shared/`.

### `src/context/conversations-v2/`

**Proposito:** Sistema de chat en tiempo real. El contexto mas complejo del proyecto.
**Contiene:** Chat aggregate con maquina de estados (PENDING→ASSIGNED→ACTIVE→CLOSED), Message aggregate con soporte de adjuntos/IA, sistema de colas, reglas de asignacion automatica, busqueda full-text.
**Entry points:** 4 controladores REST + integracion WebSocket via eventos de dominio.

### `src/context/visitors-v2/`

**Proposito:** Tracking e identificacion de visitantes del sitio web.
**Contiene:** Visitor aggregate con lifecycle state machine (ANON→ENGAGED→LEAD→CONVERTED), gestion de sesiones embebidas, presencia via Redis, filtros guardados.
**Entry points:** 4 controladores REST.

### `src/context/auth/`

**Proposito:** Autenticacion y autorizacion multi-mecanismo.
**Contiene:** 4 sub-contextos (api-key, auth-user, auth-visitor, bff). API Keys RSA 4096, JWT Bearer, BFF OIDC/PKCE con Keycloak, JWKS endpoint.
**Entry points:** 5 controladores REST.

### `src/websocket/`

**Proposito:** Gateway WebSocket centralizado para comunicacion en tiempo real.
**Contiene:** Socket.IO gateway con 13 eventos suscritos, autenticacion JWT en handshake, salas por chat/visitante/tenant/presencia.

### `src/context/tracking-v2/`

**Proposito:** Ingestion de eventos de tracking de alto rendimiento.
**Contiene:** Buffer de eventos con flush periodico, colecciones MongoDB particionadas por mes, endpoints de estadisticas.

---

## Entry Points

- **Main Entry:** `src/main.ts` - Bootstrap NestJS con Swagger, CORS, ValidationPipe global
- **CLI:** `bin/guiders-cli.js` - Comandos: `create-company`, `clean-database`
- **Docker:** `Dockerfile` - Multi-stage build (build → production con node:20-alpine)
- **PM2:** `ecosystem.config.js` / `ecosystem.staging.config.js`

---

## Patrones de Organizacion de Archivos

### Por Bounded Context (DDD)

Cada contexto sigue la estructura hexagonal:

```
src/context/<contexto>/
├── domain/              # Capa de dominio (pura, sin dependencias externas)
│   ├── entities/        # Aggregates (constructor privado, factory methods)
│   ├── value-objects/   # Objetos inmutables con validacion
│   ├── events/          # Eventos de dominio
│   ├── errors/          # Errores de dominio
│   └── services/        # Servicios de dominio (logica que no pertenece a un aggregate)
├── application/         # Capa de aplicacion (orquestacion)
│   ├── commands/        # Write operations (@CommandHandler)
│   ├── queries/         # Read operations (@QueryHandler)
│   ├── events/          # Event handlers (side effects)
│   ├── dtos/            # DTOs de entrada/salida
│   └── services/        # Servicios de aplicacion
└── infrastructure/      # Capa de infraestructura (adaptadores externos)
    ├── controllers/     # Controladores HTTP/REST
    ├── persistence/     # Implementaciones de repositorio
    │   ├── entity/      # Entidades ORM (TypeORM/Mongoose)
    │   ├── impl/        # Implementaciones de repositorio
    │   └── mappers/     # Mappers dominio <-> persistencia
    ├── schemas/         # Schemas Mongoose
    └── services/        # Servicios de infraestructura
```

### Tipos de Archivos Clave

| Tipo            | Patron                 | Proposito                          | Ejemplo                                   |
| --------------- | ---------------------- | ---------------------------------- | ----------------------------------------- |
| Aggregate       | `*.aggregate.ts`       | Entidad raiz con logica de negocio | `chat.aggregate.ts`                       |
| Value Object    | `*.value-object.ts`    | Objeto inmutable con validacion    | `chat-status.value-object.ts`             |
| Command Handler | `*.command-handler.ts` | Handler de operacion de escritura  | `create-chat.command-handler.ts`          |
| Query Handler   | `*.query-handler.ts`   | Handler de operacion de lectura    | `get-chat-by-id.query-handler.ts`         |
| Event Handler   | `*.event-handler.ts`   | Handler de efecto secundario       | `notify-on-chat-created.event-handler.ts` |
| Controller      | `*.controller.ts`      | Endpoint HTTP/REST                 | `chat-v2.controller.ts`                   |
| Schema (Mongo)  | `*.schema.ts`          | Schema Mongoose                    | `chat.schema.ts`                          |
| Entity (PG)     | `*.entity.ts`          | Entidad TypeORM                    | `company-typeorm.entity.ts`               |
| Mapper          | `*.mapper.ts`          | Conversor dominio <-> persistencia | `chat-mongo.mapper.ts`                    |
| DTO             | `*.dto.ts`             | Data Transfer Object               | `create-chat.dto.ts`                      |
| Test            | `*.spec.ts`            | Test unitario/integracion          | `create-chat.command-handler.spec.ts`     |
| Module          | `*.module.ts`          | Modulo NestJS                      | `conversations-v2.module.ts`              |

---

## Archivos de Configuracion

| Archivo                        | Descripcion                                        |
| ------------------------------ | -------------------------------------------------- |
| `package.json`                 | Dependencias NPM, scripts de build/test/deploy     |
| `tsconfig.json`                | TypeScript: ES2021, experimentalDecorators, strict |
| `tsconfig.build.json`          | Config de build: excluye tests y specs             |
| `nest-cli.json`                | NestJS CLI: compilerOptions, webpack               |
| `eslint.config.mjs`            | ESLint flat config: reglas TS relajadas            |
| `.prettierrc`                  | Prettier: single quotes, trailing commas           |
| `jest-unit.json`               | Jest unitario: SQLite in-memory, moduleNameMapper  |
| `jest-int.json`                | Jest integracion: MongoDB memory server            |
| `docker-compose.yml`           | Desarrollo: PostgreSQL, MongoDB, Redis, Keycloak   |
| `docker-compose-staging.yml`   | Staging: con volumenes persistentes                |
| `docker-compose-prod.yml`      | Produccion: optimizado                             |
| `Dockerfile`                   | Multi-stage: build + production (node:20-alpine)   |
| `.env.test`                    | Variables de entorno para tests                    |
| `.env.session-cleanup.example` | Ejemplo de config para limpieza de sesiones        |
| `ecosystem.config.js`          | PM2: produccion (cluster mode)                     |
| `ecosystem.staging.config.js`  | PM2: staging                                       |
| `mongodb-memory-server.json`   | Config de MongoDB memory server para tests         |

---

## Notas de Desarrollo

1. **Direccion de dependencias:** domain ← application ← infrastructure. Nunca importar infra desde domain.
2. **Tests:** Carpetas `__tests__/` junto al codigo fuente, no en carpeta separada.
3. **Convenciones:** Codigo en ingles, documentacion/comentarios/errores en espanol.
4. **Migraciones:** Solo para PostgreSQL (TypeORM). MongoDB no usa migraciones (schema-less).
5. **Feature flags:** No hay sistema de feature flags. Los contextos V1 se mantienen como legacy.
6. **Modulos:** Cada contexto tiene su propio `*.module.ts` que exporta sus providers y se importa en `app.module.ts`.

---

_Generado usando el workflow `document-project` de BMAD Method_
