# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**guiders-backend** is a NestJS v11 application that provides real-time communication infrastructure for sales teams and website visitors. It implements a Domain-Driven Design (DDD) and Command Query Responsibility Segregation (CQRS) architecture with multi-persistence (PostgreSQL + MongoDB) and WebSocket support.

## Development Commands

### Core Development
```bash
# Start development server with hot-reload
npm run start:dev

# Build project
npm run build

# Format code with Prettier
npm run format

# Lint and fix code issues
npm run lint
```

### Testing
```bash
# Run unit tests with coverage
npm run test:unit

# Run integration tests (requires PostgreSQL + MongoDB)
npm run test:int

# Run end-to-end tests
npm run test:e2e

# Run single test file
npm run test:unit -- path/to/test.spec.ts

# Run tests in watch mode
npm run test:watch

# Check coverage threshold
npm run test:check-coverage
```

### Database Management
```bash
# Run pending migrations
npm run typeorm:migrate:run

# Generate new migration
npm run typeorm:migrate:generate

# Generate migration with JavaScript output
npm run typeorm:migrate:generate:js
```

### CLI Tools
```bash
# Clean all database entities (use with caution)
node bin/guiders-cli.js clean-database --force

# Create company with admin user
node bin/guiders-cli.js create-company-with-admin --name "Test Company" --domain "test.com" --adminName "Admin" --adminEmail "admin@test.com"

# Create company without admin
node bin/guiders-cli.js create-company --name "Test Company" --domain "test.com"
```

### Environment Configuration
```bash
# Configure Keycloak client
npm run keycloak:configure
```

## Architecture Overview

### Core Principles
- **DDD**: Domain models encapsulate business rules and behavior
- **CQRS**: Commands (write) are separated from Queries (read) for scalability
- **Event-Driven**: Domain events enable loose coupling between contexts
- **Multi-Persistence**: PostgreSQL for transactional data, MongoDB for high-volume operations

### Context Structure
```
src/context/<context-name>/
├── application/        # Commands, Events, Queries, DTOs
│   ├── commands/      # Command handlers (write operations)
│   ├── events/        # Event handlers (side effects)
│   ├── queries/       # Query handlers (read operations)
│   └── dtos/          # Data Transfer Objects
├── domain/            # Business logic and rules
│   ├── entities/      # Aggregates and entities
│   ├── events/        # Domain events
│   ├── value-objects/ # Immutable value objects
│   └── repositories/  # Repository interfaces
└── infrastructure/    # External adapters
    ├── controllers/   # HTTP endpoints
    ├── persistence/   # Repository implementations
    └── services/      # External service adapters
```

**Dependency Rule**: `domain` ⇏ nothing, `application` → `domain`, `infrastructure` → `application` + `domain`

### Main Contexts

#### Core Business Contexts
- **`company`** - Company and site management (PostgreSQL)
- **`auth`** - Authentication for users and visitors (PostgreSQL)
  - `auth-user` - Commercial user authentication
  - `auth-visitor` - Website visitor authentication
  - `api-key` - API key validation and management
  - `bff` - Backend-for-Frontend authentication

#### Communication Contexts
- **`conversations`** - Legacy chat system (PostgreSQL) - maintenance only
- **`conversations-v2`** - New optimized chat system (MongoDB) - use for new features
- **`real-time`** - WebSocket communication and user presence
- **`visitors`** - Legacy visitor tracking (PostgreSQL) - maintenance only
- **`visitors-v2`** - New visitor management (MongoDB) - use for new features
- **`tracking`** - User behavior and intent detection
- **`commercial`** - Commercial user management (MongoDB)

#### Shared Infrastructure
- **`shared`** - Common value objects, utilities, and domain patterns

### Technology Stack
- **NestJS v11** - Backend framework with TypeScript
- **TypeORM** - PostgreSQL ORM for transactional data
- **Mongoose** - MongoDB ODM for high-volume operations
- **Socket.IO** - Real-time WebSocket communication
- **JWT** - Authentication tokens
- **Jest** - Testing framework
- **Redis** - Caching and session storage

## Development Patterns

### CQRS Implementation
```typescript
// Command Handler
@CommandHandler(CreateChatCommand)
export class CreateChatCommandHandler {
  constructor(
    @Inject(CHAT_REPOSITORY) private repository: ChatRepository,
    private publisher: EventPublisher
  ) {}

  async execute(command: CreateChatCommand): Promise<Result<string, DomainError>> {
    const chat = Chat.create(command.visitorId, command.companyId);
    const chatCtx = this.publisher.mergeObjectContext(chat);
    const saveResult = await this.repository.save(chatCtx);
    if (saveResult.isErr()) return saveResult;

    chatCtx.commit(); // CRITICAL: Must call commit() to dispatch events
    return ok(chat.getId().value);
  }
}
```

### Event Handler Pattern
Event handlers follow the naming convention: `<NewAction>On<OldEvent>EventHandler`

```typescript
@EventsHandler(CompanyCreatedEvent)
export class CreateApiKeyOnCompanyCreatedEventHandler {
  // Creates API key when company is created
}
```

### Result Pattern for Error Handling
```typescript
import { Result, ok, err, okVoid } from 'src/context/shared/domain/result';

// Instead of throwing exceptions, return Result
const result = await this.service.validateInput(data);
if (result.isErr()) {
  return result.error(); // Handle error gracefully
}
const value = result.unwrap(); // Safe to unwrap
```

**Rule**: Do not throw exceptions for expected validation flows. Use `Result` for expected errors.

### Domain Modeling

#### Aggregate Root
```typescript
export class Chat extends AggregateRoot {
  private constructor(
    private readonly _id: ChatId,
    private readonly _status: ChatStatus,
    // ... more private readonly fields
  ) { super(); }

  // Factory that emits events
  static create(visitorId: VisitorId, companyId: CompanyId): Chat {
    const chat = new Chat(ChatId.generate(), ChatStatus.pending(), /* ... */);
    chat.apply(new ChatCreatedEvent(chat.toPrimitives()));
    return chat;
  }

  // Rehydration without events
  static fromPrimitives(data: ChatPrimitives): Chat {
    return new Chat(
      ChatId.create(data.id),
      ChatStatus.create(data.status),
      // ...
    );
  }

  toPrimitives(): ChatPrimitives {
    return { id: this._id.value, status: this._status.value, /* ... */ };
  }
}
```

#### Value Objects
Extend `PrimitiveValueObject` or reuse from `shared/domain/value-objects`. Do not create `create()` method if it already exists in the base class.

### Repository Pattern
```typescript
// Domain interface
export interface ChatRepository {
  save(chat: Chat): Promise<Result<void, DomainError>>;
  findById(id: ChatId): Promise<Result<Chat, DomainError>>;
  match(criteria: Criteria<Chat>): Promise<Result<Chat[], DomainError>>;
}
export const CHAT_REPOSITORY = Symbol('ChatRepository');

// Infrastructure implementation
@Injectable()
export class MongoChatRepositoryImpl implements ChatRepository {
  constructor(
    @InjectModel(ChatMongoEntity.name) private model: Model<ChatDocument>
  ) {}

  async match(criteria: Criteria<Chat>): Promise<Result<Chat[], DomainError>> {
    const fieldMap = { id: '_id', status: 'status', createdAt: 'createdAt' };
    const query = CriteriaConverter.toMongoQuery(criteria, fieldMap);
    const docs = await this.model.find(query).exec();
    return ok(docs.map(ChatMapper.fromPersistence));
  }
}

// In module
providers: [
  { provide: CHAT_REPOSITORY, useClass: MongoChatRepositoryImpl }
]
```

**Mappers**: Use `toPersistence(aggregate)` / `fromPersistence(entity)`. Never expose TypeORM/Mongoose entities outside infrastructure layer.

## WebSocket Development

### Gateway Structure
```typescript
@WebSocketGateway()
@UseGuards(WsAuthGuard, WsRolesGuard)
export class ChatGateway {
  @SubscribeMessage('chat:send-message')
  @Roles(['visitor', 'commercial'])
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: SendMessageDto) {
    // Always delegate to CommandBus/QueryBus
    const result = await this.commandBus.execute(new SendMessageCommand(payload));

    // Uniform response
    return ResponseBuilder.create()
      .addSuccess(result.isOk())
      .addMessage(result.isOk() ? 'Mensaje enviado' : result.error.message)
      .addData(result.isOk() ? result.unwrap() : null)
      .build();
  }
}
```

**Guards**: `WsAuthGuard` + `WsRolesGuard` are mandatory. Gateway = orchestrator, no domain logic.

## Multi-Persistence Strategy

### PostgreSQL (TypeORM)
- **Contexts**: `auth`, `company`, `tracking`, `conversations` (V1), `visitors` (V1)
- **Use for**: Transactional data, complex relationships, referential integrity

```typescript
// CriteriaConverter for safe queries
const { sql, parameters } = CriteriaConverter.toPostgresSql(
  criteria,
  'visitors',
  { id: 'id', name: 'name', email: 'email' }
);
const entities = await this.repository
  .createQueryBuilder('visitors')
  .where(sql.replace(/^WHERE /, ''))
  .setParameters(parameters)
  .getMany();
```

### MongoDB (Mongoose)
- **Contexts**: `conversations-v2`, `visitors-v2`, `commercial`
- **Use for**: High volume, aggregations, metrics, complex read queries

```typescript
// Projections for performance
const chats = await this.model
  .find(query)
  .select('_id status createdAt') // Only necessary fields
  .lean() // Plain JS objects, no Mongoose overhead
  .exec();
```

**V1→V2 Migration**: Temporary coexistence. New features only in V2.

## Testing Strategy

### Unit Tests
```typescript
describe('AssignChatToCommercialCommandHandler', () => {
  let handler: AssignChatToCommercialCommandHandler;
  let mockRepo: jest.Mocked<ChatRepository>;

  beforeEach(async () => {
    mockRepo = { findById: jest.fn(), update: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        AssignChatToCommercialCommandHandler,
        { provide: CHAT_REPOSITORY, useValue: mockRepo },
        { provide: EventPublisher, useValue: { mergeObjectContext: jest.fn() } }
      ]
    }).compile();
    handler = module.get(AssignChatToCommercialCommandHandler);
  });

  it('should assign successfully with valid UUIDs', async () => {
    const chatId = Uuid.random().value; // ⚠️ Use real UUIDs
    const commercialId = Uuid.random().value;

    mockRepo.findById.mockResolvedValue(ok(mockChat));
    mockRepo.update.mockResolvedValue(okVoid());

    const result = await handler.execute(new AssignCommand({ chatId, commercialId }));
    expect(result.isOk()).toBe(true);
  });
});
```

**Commands**:
- Unit: `npm run test:unit` (SQLite in memory, fast)
- Integration: `npm run test:int` (PostgreSQL + MongoDB real)
- E2E: `npm run test:e2e` (complete server)

**E2E Pattern**:
- Use real services (docker-compose with `test` profile)
- Mock guards: `MockAuthGuard`, `MockOptionalAuthGuard`
- Mock domain objects with `toPrimitives()` and `getValue()`
- Timeout: 120s (configured in jest)

### Integration Tests
- Test repository implementations with real databases
- Verify CQRS command/query flow
- Test event publishing and handling

### E2E Tests
- Test complete HTTP request/response cycles
- Verify authentication flows
- Test WebSocket communication

## Code Quality Standards

### Commit Message Format
Follow Conventional Commits in Spanish:
```
feat(chat): soporte de reconexión exponencial en websocket-service

Añade lógica de backoff exponencial con jitter para reducir tormenta de reconexiones.
Incluye métrica interna de intentos y evento de telemetría.

[commit-style-v1]
```

### Code Review Guidelines
- Security vulnerabilities have highest priority
- Focus on domain logic correctness
- Verify proper event handling with `commit()`
- Check repository implementations hide persistence details
- Ensure tests cover critical business paths

## Common Development Tasks

### Adding New Domain Entity
1. Create value objects in `domain/value-objects/`
2. Implement aggregate with factory methods (`create()` vs `fromPrimitives()`)
3. Define repository interface in `domain/`
4. Create domain events in `domain/events/`
5. Implement repository in `infrastructure/persistence/`
6. Add mappers for persistence layer
7. Write unit tests for domain logic

### Adding New API Endpoint
1. Create DTO in `application/dtos/`
2. Implement command/query handler in `application/`
3. Add controller method in `infrastructure/controllers/`
4. Register providers in module
5. Add Swagger documentation
6. Write integration/E2E tests

### V1 vs V2 Migration Strategy
- **V1 contexts** (`conversations`, `visitors`) - PostgreSQL, maintenance only
- **V2 contexts** (`conversations-v2`, `visitors-v2`) - MongoDB, use for new features
- Gradual migration approach with coexistence during transition

## API Key Flow Pattern
For public-facing APIs requiring domain validation:
```typescript
// 1. Frontend sends domain + apiKey (external identifiers)
// 2. Validate API key with ValidateDomainApiKey service
// 3. Resolve company: companyRepository.findByDomain()
// 4. Find target site: site.canonicalDomain === domain || site.domainAliases.includes(domain)
// 5. Generate internal UUIDs: new TenantId(company.getId().getValue())
```

## Important Notes

### Event Publishing
Always use this pattern for aggregate persistence:
```typescript
const aggCtx = this.publisher.mergeObjectContext(aggregate);
await this.repository.save(aggCtx);
aggCtx.commit(); // Without this, events won't be dispatched!
```

### Multi-Persistence Strategy
- **PostgreSQL**: Transactional data (auth, company, legacy conversations/visitors)
- **MongoDB**: High-volume operations (conversations-v2, visitors-v2, tracking)
- Choose persistence based on access patterns and volume requirements

### Language Policy
- **Code identifiers**: English
- **Comments and documentation**: Spanish (technical neutral)
- **Swagger documentation**: Spanish
- **Error messages**: Spanish (unless external API requires English)

### Authentication Guards

#### REST Endpoints
- `@UseGuards(AuthGuard, RoleGuard)` + `@Roles(['admin', 'commercial'])`
- **DualAuthGuard**: JWT Bearer || BFF cookies (Keycloak) || Visitor session → Fails if none valid
- **OptionalAuthGuard**: Same methods but does NOT fail → Populates `request.user` if auth present

#### WebSocket Endpoints
- `@UseGuards(WsAuthGuard, WsRolesGuard)` + `@Roles(['visitor', 'commercial'])`

## Anti-Patterns (Block)

❌ Business logic in controllers/gateways
❌ Exceptions for expected validation flows (use `Result`)
❌ Manual concatenated SQL (use `CriteriaConverter` + QueryBuilder)
❌ Exposing TypeORM/Mongoose entities outside infrastructure
❌ Forgetting `commit()` in command handlers → events not published
❌ Importing infrastructure from domain
❌ Event handlers without naming pattern `<Action>On<Event>EventHandler`
❌ Fake UUIDs in tests (use `Uuid.random().value`)

## PR Checklist

- [ ] Value Objects/Result applied correctly
- [ ] Events published with `mergeObjectContext` + `commit()`
- [ ] Repositories use mappers and hide ORM details
- [ ] Migration/index created if new filterable field
- [ ] Tests passing (unit + int/E2E if applicable) with coverage OK
- [ ] `npm run lint` and `npm run format` without errors
- [ ] Swagger + READMEs updated if contract changes
