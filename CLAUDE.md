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

  async execute(command: CreateChatCommand): Promise<void> {
    const chat = Chat.create(command.visitorId, command.companyId);
    const chatCtx = this.publisher.mergeObjectContext(chat);
    await this.repository.save(chatCtx);
    chatCtx.commit(); // CRITICAL: Must call commit() to dispatch events
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
import { Result } from 'src/context/shared/domain/result';

// Instead of throwing exceptions, return Result
const result = await this.service.validateInput(data);
if (result.isErr()) {
  return result.error(); // Handle error gracefully
}
const value = result.unwrap(); // Safe to unwrap
```

### Repository Pattern
```typescript
// Domain interface
export interface ChatRepository {
  save(chat: Chat): Promise<void>;
  findById(id: ChatId): Promise<Optional<Chat>>;
  findByCompany(companyId: CompanyId): Promise<Chat[]>;
}

// Infrastructure implementation
@Injectable()
export class MongoChatRepositoryImpl implements ChatRepository {
  // Implementation details hidden from domain
}
```

## WebSocket Development

### Gateway Structure
```typescript
@WebSocketGateway()
@UseGuards(WsAuthGuard, WsRolesGuard)
export class WebSocketGateway {
  @SubscribeMessage('chat:message')
  @Roles(['visitor', 'commercial'])
  async handleMessage(client: Socket, payload: MessagePayload) {
    // Always delegate to CommandBus/QueryBus
    return this.commandBus.execute(new SendMessageCommand(payload));
  }
}
```

### Response Format
```typescript
// Use consistent response format
const response = ResponseBuilder.create()
  .addSuccess(true)
  .addMessage('Message sent successfully')
  .addData({ messageId: '123' })
  .build();
```

## Testing Strategy

### Unit Tests
- Mock external dependencies
- Test business logic in isolation
- Use `Test.createTestingModule()` for NestJS components
- Override guards with `MockAuthGuard`/`MockRolesGuard`

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
- REST endpoints: `@UseGuards(AuthGuard, RoleGuard)` + `@Roles(['admin', 'commercial'])`
- WebSocket endpoints: `@UseGuards(WsAuthGuard, WsRolesGuard)` + `@Roles(['visitor'])`