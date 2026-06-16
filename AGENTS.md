# AGENTS.md - Guiders Backend

NestJS v11 backend with DDD+CQRS architecture, multi-persistence (PostgreSQL + MongoDB), and real-time WebSocket communication.

## Build, Lint & Test Commands

```bash
# Development
npm run start:dev              # Start with hot-reload
npm run build                  # Production build
npm run lint                   # ESLint with auto-fix
npm run format                 # Prettier formatting

# Testing - Unit (fast, SQLite in-memory)
npm run test:unit                                    # All unit tests
npm run test:unit -- src/context/auth/application/commands/__tests__/file.spec.ts  # Single file
npm run test:unit -- --testNamePattern="should create"   # Tests matching pattern

# Testing - Integration (requires real DBs)
npm run test:int                 # All integration tests
npm run test:int:dev             # Without coverage

# Testing - E2E
npm run test:e2e                 # Full server tests

# Database
npm run typeorm:migrate:run      # Run PostgreSQL migrations
npm run typeorm:migrate:generate # Generate new migration

# CLI Tools
node bin/guiders-cli.js create-company --name "Company" --domain "example.com"
node bin/guiders-cli.js clean-database --force

# OpenCode Custom Commands (recommended)
/publish              # Publish to GitHub with full validations (lint + tests + build)
/publish-quick        # Quick publish (lint + unit tests only)
/publish-full         # Full publish including E2E tests
```

> **💡 Tip:** Use `/publish` in OpenCode to automatically run lint, tests, build, commit and push to GitHub.  
> See [OpenCode Commands Guide](./.opencode/QUICK_START.md) for details.

## Project Structure

```
src/context/<context>/
├── domain/              # Pure business logic (no external deps)
│   ├── entities/        # Aggregates extending AggregateRoot
│   ├── value-objects/   # Immutable objects with validation
│   ├── events/          # Domain events
│   └── <entity>.repository.ts  # Interface + Symbol
├── application/         # Orchestration layer
│   ├── commands/        # Write operations (@CommandHandler)
│   ├── queries/         # Read operations (@QueryHandler)
│   ├── events/          # Side-effects handlers
│   └── dtos/            # API contracts
└── infrastructure/      # External adapters
    ├── controllers/     # HTTP/WebSocket endpoints
    ├── persistence/     # Repository implementations
    └── services/        # External integrations
```

**Active Contexts (V2 - MongoDB)**: `conversations-v2`, `visitors-v2` - Use for new features  
**Legacy Contexts (V1 - PostgreSQL)**: `conversations`, `visitors` - Maintenance only  
**Core**: `auth`, `company`, `tracking`, `llm`, `leads`

## Code Style Guidelines

### Formatting (Prettier)

- Single quotes: `'string'`
- Trailing commas: always
- Run `npm run format` before committing

### ESLint Rules

- `@typescript-eslint/no-explicit-any`: off (allowed)
- `@typescript-eslint/no-unused-vars`: error, but `_` prefix ignored
- Floating promises: warn
- Unsafe operations: warn (relaxed in test files)

### TypeScript

- Target: ES2021
- `strictNullChecks`: enabled
- `experimentalDecorators`: enabled
- `emitDecoratorMetadata`: enabled

### Naming Conventions

| Element              | Pattern                           | Example                               |
| -------------------- | --------------------------------- | ------------------------------------- |
| Aggregate            | `<Entity>` or `<Entity>Aggregate` | `Chat`, `ChatAggregate`               |
| Aggregate file       | `<entity>.aggregate.ts`           | `chat.aggregate.ts`                   |
| Value Object         | `<Name>`                          | `ChatId`, `ChatStatus`                |
| Repository interface | `<Entity>Repository`              | `ChatRepository`                      |
| Repository impl      | `Mongo<Entity>RepositoryImpl`     | `MongoChatRepositoryImpl`             |
| Command Handler      | `<Action>CommandHandler`          | `CreateChatCommandHandler`            |
| Query Handler        | `<Action>QueryHandler`            | `GetChatByIdQueryHandler`             |
| Event Handler        | `<Action>On<Event>EventHandler`   | `NotifyOnChatCreatedEventHandler`     |
| Test file            | `<name>.spec.ts`                  | `create-chat.command-handler.spec.ts` |

### Import Order

1. External packages (`@nestjs/*`, `mongoose`, etc.)
2. Shared context (`src/context/shared/*`)
3. Same context imports
4. Relative imports

## Architecture Patterns

### Result Pattern (CRITICAL)

Use `Result<T, E>` instead of exceptions for expected errors:

```typescript
import { Result, ok, err, okVoid } from 'src/context/shared/domain/result';

async findById(id: ChatId): Promise<Result<Chat, DomainError>> {
  const entity = await this.model.findOne({ id: id.value });
  if (!entity) return err(new ChatNotFoundError(id.value));
  return ok(this.mapper.toDomain(entity));
}

// In handlers - check before unwrap
if (result.isErr()) return result;
const value = result.unwrap(); // Safe after isErr check
```

### Event Publishing (CRITICAL)

Always call `commit()` after `mergeObjectContext()` + `save()`:

```typescript
const aggregate = this.publisher.mergeObjectContext(chat);
const saveResult = await this.repo.save(aggregate);
if (saveResult.isErr()) return saveResult;
aggregate.commit(); // Without this, events are NOT published
```

### Aggregates

- Private constructor, use factory methods
- `create()` - emits events (new entities)
- `fromPrimitives()` - no events (rehydration)
- `toPrimitives()` - serialization

### Mappers

Never expose ORM entities outside infrastructure. Use mappers:

- `toPersistence(aggregate)` - domain to ORM entity
- `fromPersistence(entity)` - ORM entity to domain

## Testing Guidelines

### TDD Strategy (MANDATORY DEFAULT)

**Por defecto, todo desarrollo sigue la estrategia TDD (Test-Driven Development)**. Cuando el usuario pida "desarrollar", "implementar", "crear" o similar:

1. **RED phase** (delegada al subagente `tdd-generator`):
   - Invocar `@tdd-generator` con la story/spec a implementar
   - El subagente genera los tests PRIMERO y los ejecuta
   - Confirma que los tests fallan (RED) — son la especificación ejecutable

2. **GREEN phase** (implementación por el agente principal):
   - Implementar el código MÍNIMO para que los tests pasen
   - No añadir features que no estén cubiertas por tests

3. **REFACTOR phase**:
   - Mejorar estructura manteniendo tests verdes
   - Aplicar patrones del proyecto (Result, Symbol DI, DDD)

**Excepciones a TDD** (consultar con el usuario antes de proceder):
- Refactors sin cambio de comportamiento
- Cambios puramente de configuración (Docker, CI, etc.)
- Documentación / AGENTS.md updates
- Cambios cosméticos (lint, prettier)

### Delegating Tests to Subagent

El proyecto tiene un subagente especializado `@tdd-generator` definido en `.opencode/agents/tdd-generator.md`. Su responsabilidad:

- Lee la story + PRD + Architecture + AGENTS.md del contexto
- Genera archivos `*.spec.ts` / `*.int-spec.ts` / `*.e2e-spec.ts`
- Sigue los patterns del proyecto (Spanish describe, `Uuid.random().value`, etc.)
- Confirma la fase RED (tests fallan)
- Reporta archivos creados + coverage de ACs

**Cuándo invocarlo**:
- El usuario dice "desarrolla Story X" o "implementa feature Y"
- Una nueva command/query necesita tests
- Se añade un nuevo endpoint HTTP

**Cuándo NO invocarlo**:
- El usuario explícitamente dice "no uses TDD" o "skip tests"
- Es un fix de typo / format / lint
- Es actualización de docs

**AI-1.5 — Wrapper con fallback automático**: El subagente `@tdd-generator` ha retornado output vacío (`<output></output>`) en 2/2 invocaciones consecutivas (Story 2.1 + Story 2.2). **NO** se debe confiar ciegamente en su output. Usar `.opencode/skills/try-tdd-generator.md` que documenta:
- **Step 1**: Invocar el subagente
- **Step 2**: Detectar fallo usando `detectSubagentFailure()` (en `src/context/shared/dev-tools/try-tdd-generator/__tests__/try-tdd-generator.sop.spec.ts` — 18 tests cubren los 6 failure signals)
- **Step 3**: Si falló, **fallback manual** al patrón validado de Story 1.3/2.1/2.2 (mocks `const`, `app = await buildApp(...)` ANTES de `mockResolvedValue`, AI-3 assertions específicas — nunca `instanceof BaseError`)

Esta decisión del retro de Story 2.2 previene el ciclo "subagent falla → dev agent escribe tests → inconsistencias" en las 3 stories restantes de Epic 2.

**AI-2 — Acceptance Auditors deben citar el spec text exacto** (PR #111 review, 2026-06-16): El subagente PASS 3 (Acceptance Auditor) del review de PR #111 inventó 3 ACs que NO existían en el spec real:

- "Story 1.3 AC5: Validates origin is in `embedAllowedOrigins`" — NO existe
- "Story 1.3 AC3 / 1.4 AC3: response includes `refreshAfter` / `refreshedAt`" — NO existe
- "Story 1.4 AC2/AC8: cross-check header-vs-body" — NO existe (spec dice "no body DTO needed")

Esto generó 3 issues falsas (#112, #113, #114) que casi bloquean un merge innecesariamente. Re-verificación contra el spec real tomó 10 min y reveló que la implementación era correcta.

**Regla para futuros acceptance auditors** (subagentes o humanos):
- Cada AC debe ir con una **cita literal del spec entre comillas** (`> "..."`).
- Si el AC a auditar NO está en el spec, es un **enhancement** (no un bug).
- Si la implementación difiere del spec, es un **bug real** (cita la línea exacta del spec que se viola).
- NUNCA inferir ACs basándose en "mejores prácticas" o "lo que debería ser".

Mitigación: añadir a `try-tdd-generator` SOP (AI-1.5) un check de "spec citation" antes de aceptar el output de cualquier subagente de review.

### Test Patterns

- Use `@nestjs/testing` for module creation
- Tests in `__tests__/` folder alongside source
- **Always use real UUIDs**: `Uuid.random().value` (never fake IDs)
- Mock dependencies with `jest.Mocked<T>`
- Describe blocks in Spanish, test logic validates behavior
- **Test naming**:
  - Unit: `<file>.spec.ts` in `__tests__/` next to source
  - Integration: `<file>.int-spec.ts` in `__tests__/` next to source
  - E2E: `<file>.e2e-spec.ts` in `test/` directory

```typescript
describe('CreateChatCommandHandler', () => {
  it('debe crear un chat exitosamente', async () => {
    const chatId = Uuid.random().value; // Real UUID
    mockRepo.save.mockResolvedValue(okVoid());
    const result = await handler.execute(command);
    expect(result.isOk()).toBe(true);
  });
});
```

## Subagents Disponibles

| Agent | Mode | Purpose | Cuándo invocar |
|-------|------|---------|----------------|
| `build` | primary | Default agent con acceso completo | Default (Tab) |
| `plan` | primary | Análisis sin cambios | Análisis de código |
| `general` | subagent | Multi-step research + ejecución | Tareas complejas en paralelo |
| `explore` | subagent | Read-only codebase exploration | Búsquedas rápidas |
| `scout` | subagent | Read-only external docs | Investigación de dependencias |
| `tdd-generator` | subagent | **Genera tests failing (RED phase)** | **Inicio de cualquier desarrollo nuevo** |

**Invocar el subagente `tdd-generator`**:

```
@tdd-generator genera los tests para Story 1.4 — RefreshEmbedTokenCommand
```

El subagente:
1. Lee `_bmad-output/implementation-artifacts/<story-key>.md`
2. Lee AGENTS.md del contexto afectado
3. Lee source files existentes (repos, services, etc.)
4. Genera los archivos de test
5. Confirma que los tests fallan (RED)
6. Reporta archivos creados + AC coverage

Una vez completado el RED phase, el agente principal (build) implementa el código para hacer pasar los tests (GREEN).

## Anti-Patterns (BLOCK)

| Prohibited                          | Correct                                      |
| ----------------------------------- | -------------------------------------------- |
| Business logic in controllers       | Delegate to CommandBus/QueryBus              |
| `throw new Error()` for validations | `return err(new DomainError())`              |
| Concatenated SQL                    | `CriteriaConverter` + QueryBuilder           |
| Exposing ORM entities               | Use mappers in infrastructure                |
| Forgetting `commit()`               | Always after `save()`                        |
| Importing infra from domain         | Only domain <- application <- infrastructure |
| Fake UUIDs in tests                 | `Uuid.random().value`                        |

## Language Policy

| Element              | Language                       |
| -------------------- | ------------------------------ |
| Code identifiers     | English                        |
| Comments & docs      | Spanish                        |
| Swagger descriptions | Spanish                        |
| Error messages       | Spanish                        |
| Commit messages      | Spanish (Conventional Commits) |

## Feature-Specific Documentation

Each context has its own `AGENTS.md` with detailed feature specifications, domain models, and implementation guidelines:

### Core Contexts

- **[auth](./src/context/auth/AGENTS.md)** - Authentication & authorization (JWT, roles, permissions)
- **[company](./src/context/company/AGENTS.md)** - Company management & organization
- **[shared](./src/context/shared/AGENTS.md)** - Shared utilities (Result pattern, Value Objects, Events)

### Active Contexts (V2 - MongoDB)

- **[conversations-v2](./src/context/conversations-v2/AGENTS.md)** - Chat system with real-time messaging
- **[visitors-v2](./src/context/visitors-v2/AGENTS.md)** - Visitor tracking & identification
- **[tracking-v2](./src/context/tracking-v2/AGENTS.md)** - Event tracking & analytics

### Feature Contexts

- **[leads](./src/context/leads/AGENTS.md)** - Lead management & tracking
- **[llm](./src/context/llm/AGENTS.md)** - LLM integration & AI features
- **[lead-scoring](./src/context/lead-scoring/AGENTS.md)** - Lead scoring & qualification
- **[commercial](./src/context/commercial/AGENTS.md)** - Commercial/billing operations
- **[white-label](./src/context/white-label/AGENTS.md)** - White-label customization
- **[consent](./src/context/consent/AGENTS.md)** - Consent management & GDPR

### Legacy Contexts (V1 - PostgreSQL, Maintenance Only)

- **[conversations](./src/context/conversations/AGENTS.md)** - Legacy chat system (deprecated)
- **[visitors](./src/context/visitors/AGENTS.md)** - Legacy visitor tracking (deprecated)

## How to Navigate This Documentation

1. **Start here** for general architecture, build commands, and code style
2. **Visit feature-specific AGENTS.md** for detailed domain models, use cases, and implementation patterns
3. Each feature AGENTS.md includes:
   - Context overview and responsibilities
   - Domain entities and value objects
   - Key use cases and commands
   - Database schema (if applicable)
   - Integration points with other contexts
   - Testing strategies
   - Known limitations and future improvements

## Additional Resources

- **Detailed rules**: `.claude/rules/` (21 architecture pattern files)
- **Copilot instructions**: `.github/copilot-instructions.md`
- **Context-specific instructions**: `.github/instructions/*.instructions.md`
- **Commit conventions**: `.copilot-commit-message-instructions.md`
