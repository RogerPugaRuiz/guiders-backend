# AGENTS.md - Shared Context

Foundational utilities, patterns, and value objects shared across all contexts. Contains critical architectural patterns that MUST be used throughout the codebase.

**Parent documentation**: [Root AGENTS.md](../../AGENTS.md)

## Context Overview

The Shared context provides:

- **Result Pattern** - Type-safe error handling (CRITICAL)
- **Domain Events** - Event publishing and subscription
- **Value Objects** - Reusable domain primitives
- **Domain Errors** - Standard error hierarchy
- **Mappers** - Domain-to-ORM transformation utilities
- **UUID Generation** - Consistent ID creation
- **Event Emitter** - Domain event publishing

This context is **imported by all other contexts** and establishes the architectural foundation.

## Directory Structure

```
src/context/shared/
├── domain/
│   ├── aggregate-root.ts       # Base class for all aggregates
│   ├── result.ts               # Result<T, E> type (CRITICAL)
│   ├── domain-event.ts         # Base event class
│   ├── domain-error.ts         # Error base class
│   ├── value-object.ts         # Base VO class
│   ├── uuid.ts                 # UUID utilities
│   └── event-emitter.ts        # Event publishing
├── application/
│   ├── command.ts              # Command base class
│   ├── query.ts                # Query base class
│   └── mappers/                # Shared mapper utilities
└── infrastructure/
    ├── persistence/            # Base repository interfaces
    └── event-publisher.ts      # Event publishing implementation
```

## Critical Pattern: Result<T, E>

**This is the MOST IMPORTANT pattern in the codebase. Use it everywhere.**

Instead of throwing exceptions, return Result types:

```typescript
import { Result, ok, err, okVoid } from 'src/context/shared/domain/result';

// Function signature
async findById(id: ChatId): Promise<Result<Chat, DomainError>> {
  const entity = await this.model.findOne({ id: id.value });
  if (!entity) {
    return err(new ChatNotFoundError(id.value));
  }
  return ok(this.mapper.toDomain(entity));
}

// Usage
const result = await chatRepository.findById(chatId);
if (result.isErr()) {
  // Handle error gracefully
  return result; // Propagate to caller
}
const chat = result.unwrap(); // Type-safe extraction
// Now you can safely use chat
```

### Result API

```typescript
// Check if successful
result.isOk(); // true if Result<T, E> matches Ok<T>
result.isErr(); // true if Result<T, E> matches Err<E>

// Extract value
result.unwrap(); // Get T (use only after isOk check)
result.unwrapErr(); // Get E (use only after isErr check)

// Transform
result.map((t) => transform(t)); // Success path transformation
result.mapErr((e) => newError(e)); // Error path transformation
result.flatMap((t) => anotherResult(t)); // Chain Results

// Provide default
result.unwrapOr(defaultValue); // Use default if Err
result.unwrapOrElse((e) => computeDefault(e));

// Inspect without unwrapping
result.match(
  (ok) => handleSuccess(ok),
  (err) => handleError(err),
);
```

### When to Use Result vs Exceptions

| Scenario                                           | Use Result | Use Exception |
| -------------------------------------------------- | ---------- | ------------- |
| Expected business error (not found, invalid input) | ✅ YES     | ❌ NO         |
| Programmer error (null pointer, array access)      | ❌ NO      | ✅ YES        |
| Validation failure                                 | ✅ YES     | ❌ NO         |
| HTTP 4xx errors                                    | ✅ YES     | ❌ NO         |
| HTTP 5xx errors                                    | ❌ NO      | ✅ YES        |
| Resource exhaustion                                | ❌ NO      | ✅ YES        |

## Domain Events

Aggregates emit domain events to communicate side-effects:

```typescript
// Domain event definition
export class ChatCreatedEvent extends DomainEvent {
  public static EVENT_NAME = 'ChatCreatedEvent';

  constructor(
    public readonly chatId: string,
    public readonly visitorId: string,
    public readonly createdAt: Date = new Date(),
  ) {
    super(ChatCreatedEvent.EVENT_NAME);
  }
}

// Aggregate emits event
export class Chat extends AggregateRoot<ChatId> {
  public static create(visitorId: VisitorId): Chat {
    const chat = new Chat(Uuid.random(), visitorId, []);
    chat.addDomainEvent(new ChatCreatedEvent(chat.id.value, visitorId.value));
    return chat;
  }
}

// Handler subscribes to event
@EventsHandler(ChatCreatedEvent)
export class NotifyOnChatCreatedEventHandler
  implements IEventHandler<ChatCreatedEvent>
{
  async handle(event: ChatCreatedEvent) {
    // Emit notification, send email, etc.
  }
}
```

### Event Publishing Lifecycle

**CRITICAL**: Must call `commit()` after `save()`:

```typescript
// 1. Retrieve aggregate
const aggregate = this.publisher.mergeObjectContext(chat);

// 2. Apply changes
aggregate.updateStatus(ChatStatus.CLOSED);

// 3. Save to persistence
const saveResult = await this.chatRepository.save(aggregate);
if (saveResult.isErr()) return saveResult;

// 4. Publish domain events
aggregate.commit(); // WITHOUT THIS, EVENTS NOT PUBLISHED!

return ok(aggregate);
```

Without `commit()`, domain events are lost and side-effects don't trigger.

## Value Objects

Reusable immutable domain concepts:

```typescript
// UUID-based identifier
export class ChatId extends Uuid {
  constructor(value: string) {
    super(value);
  }
}

// String-based value object
export class ChatStatus extends ValueObject {
  public static OPEN = new ChatStatus('OPEN');
  public static CLOSED = new ChatStatus('CLOSED');
  public static ARCHIVED = new ChatStatus('ARCHIVED');

  private constructor(public readonly value: string) {
    super();
  }

  equals(other: ChatStatus): boolean {
    return this.value === other.value;
  }
}

// Complex value object with validation
export class Email extends ValueObject {
  public readonly value: string;

  static create(value: string): Result<Email, InvalidEmailError> {
    if (!this.isValidEmail(value)) {
      return err(new InvalidEmailError(value));
    }
    return ok(new Email(value));
  }

  private constructor(value: string) {
    super();
    this.value = value.toLowerCase();
  }

  private static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
```

### Value Object Guidelines

✅ **DO**:

- Make immutable (readonly fields)
- Implement `equals()` for comparison
- Add validation in factory methods
- Use `Result<VO, Error>` from `create()` factory
- Override `toString()` for debugging

❌ **DON'T**:

- Add business logic (belongs in aggregates)
- Make mutable
- Use setters
- Expose internal state
- Create without validation

## Domain Errors

Hierarchical error system for better error handling:

```typescript
// Base error
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// Specific domain error
export class ChatNotFoundError extends DomainError {
  constructor(chatId: string) {
    super('CHAT_NOT_FOUND', `Chat ${chatId} not found`);
  }
}

// In handler
const result = await chatRepository.findById(chatId);
if (result.isErr()) {
  const error = result.unwrapErr();
  if (error instanceof ChatNotFoundError) {
    return res.status(404).json({ message: error.message });
  }
  return res.status(500).json({ message: 'Unexpected error' });
}
```

## UUID Utilities

Consistent ID generation across the codebase:

```typescript
import { Uuid } from 'src/context/shared/domain/uuid';

// Generate new UUID
const id = Uuid.random();
const idValue = id.value; // string format

// Create from string
const existingId = new Uuid('550e8400-e29b-41d4-a716-446655440000');

// Custom ID by extending Uuid
export class ChatId extends Uuid {
  constructor(value: string) {
    super(value);
  }

  // Optional: override toString
  toString(): string {
    return `Chat#${this.value}`;
  }
}
```

**NEVER use fake UUIDs in tests** - always use `Uuid.random().value`

## Aggregate Root

Base class for all aggregates:

```typescript
export abstract class AggregateRoot<T extends Uuid> extends ValueObject {
  private domainEvents: DomainEvent[] = [];

  protected constructor(
    public readonly id: T,
    // ... other properties
  ) {
    super();
  }

  // Add event to be published
  protected addDomainEvent(domainEvent: DomainEvent): void {
    this.domainEvents.push(domainEvent);
  }

  // Get all unpublished events
  getDomainEvents(): DomainEvent[] {
    return this.domainEvents;
  }

  // Clear after publishing
  clearDomainEvents(): void {
    this.domainEvents = [];
  }

  // Commit events to publisher
  commit(): void {
    // Implementation in infrastructure
  }
}
```

## Mappers

Transform between domain and persistence layers:

```typescript
// Domain mapper interface
export interface Mapper<DomainEntity, PersistenceEntity> {
  toPersistence(entity: DomainEntity): PersistenceEntity;
  fromPersistence(raw: PersistenceEntity): DomainEntity;
}

// Implementation
@Injectable()
export class ChatMapper implements Mapper<Chat, ChatDocument> {
  toPersistence(chat: Chat): ChatDocument {
    return {
      _id: new ObjectId(chat.id.value),
      visitorId: chat.visitorId.value,
      messages: chat.messages.map(m => ({
        id: m.id.value,
        content: m.content,
        // ...
      })),
    };
  }

  fromPersistence(raw: ChatDocument): Chat {
    return Chat.fromPrimitives({
      id: raw._id.toString(),
      visitorId: raw.visitorId,
      messages: raw.messages.map(m => ({
        id: m.id,
        content: m.content,
        // ...
      })),
    });
  }
}

// Usage in repository
async findById(id: ChatId): Promise<Result<Chat, DomainError>> {
  const doc = await this.collection.findOne({ _id: new ObjectId(id.value) });
  if (!doc) return err(new ChatNotFoundError(id.value));
  return ok(this.mapper.fromPersistence(doc));
}
```

## Testing Utilities

### Creating Test Results

```typescript
// Success
const result = ok(chat);
expect(result.isOk()).toBe(true);

// Error
const result = err(new ChatNotFoundError('123'));
expect(result.isErr()).toBe(true);
```

### Mocking Repositories

```typescript
const mockRepository: jest.Mocked<ChatRepository> = {
  findById: jest.fn().mockResolvedValue(ok(chat)),
  save: jest.fn().mockResolvedValue(okVoid()),
};
```

### Testing Result-based Functions

```typescript
it('debe retornar error si chat no existe', async () => {
  mockRepository.findById.mockResolvedValue(err(new ChatNotFoundError('123')));

  const result = await handler.execute(command);

  expect(result.isErr()).toBe(true);
  expect(result.unwrapErr()).toBeInstanceOf(ChatNotFoundError);
});
```

## Common Patterns

### Creating a New Aggregate

```typescript
// Always return Result from factory
export class Chat extends AggregateRoot<ChatId> {
  public static create(visitorId: VisitorId): Chat {
    const chat = new Chat(Uuid.random(), visitorId, []);
    chat.addDomainEvent(new ChatCreatedEvent(...));
    return chat;
  }

  // Rehydrating from persistence
  public static fromPrimitives(raw: any): Chat {
    return new Chat(
      new ChatId(raw.id),
      new VisitorId(raw.visitorId),
      raw.messages,
    );
  }
}
```

### Result Chain in Handler

```typescript
async execute(command: CreateChatCommand): Promise<Result<Chat, DomainError>> {
  // 1. Validate visitor exists
  const visitorResult = await this.visitorRepository.findById(
    command.visitorId
  );
  if (visitorResult.isErr()) return visitorResult;

  // 2. Create new chat
  const chat = Chat.create(visitorResult.unwrap().id);

  // 3. Persist
  const saveResult = await this.chatRepository.save(chat);
  if (saveResult.isErr()) return saveResult;

  // 4. Publish events
  chat.commit();

  return ok(chat);
}
```

## Known Limitations

- Event publishing is synchronous (no async handlers in domain)
- No event versioning for backwards compatibility
- Event store not implemented (events in-memory)
- No event replay/event sourcing
- Value object equality uses reference comparison by default

## Anti-Patterns to Avoid

| ❌ WRONG                            | ✅ CORRECT                                         |
| ----------------------------------- | -------------------------------------------------- |
| `throw new Error('not found')`      | `return err(new NotFoundError())`                  |
| `async findById(): Promise<Entity>` | `async findById(): Promise<Result<Entity, Error>>` |
| Forget to call `commit()`           | Always call `aggregate.commit()` after `save()`    |
| `new ChatId(anyString)`             | `new ChatId(Uuid.random().value)` (in tests)       |
| Mutable value objects               | Immutable value objects with `readonly`            |
| Direct ORM entity export            | Use mapper to domain entity                        |

## Database Schema

This context doesn't define its own database schema but provides patterns used by all other contexts:

### Guidelines for Other Contexts

All contexts using Shared patterns should follow:

1. **Result Pattern**: Repository methods return `Promise<Result<T, Error>>`
2. **UUIDs**: All IDs are UUIDs generated via `Uuid.random()`
3. **Timestamps**: Use `Date` type, stored with timezone info
4. **Events**: Aggregates emit domain events via `addDomainEvent()`
5. **Mappers**: All ORM entities use mappers for conversion

## Integration Points

All other contexts depend on Shared for:

```typescript
// Core domain patterns
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainEvent } from 'src/context/shared/domain/domain-event';
import { AggregateRoot } from 'src/context/shared/domain/aggregate-root';
import { ValueObject } from 'src/context/shared/domain/value-object';
import { Uuid } from 'src/context/shared/domain/uuid';

// Testing utilities
import { Mapper } from 'src/context/shared/application/mapper';
```

## Security Guidelines

### Input Validation

All value objects should validate input:

```typescript
// CORRECT - validate on creation
Email.create('user@example.com').match(
  (email) => ok(email),
  (error) => err(error),
);

// INCORRECT - no validation
const email = new Email(userInput);
```

### Error Information

Never expose internal details in error messages:

```typescript
// CORRECT - generic error message
return err(new AuthenticationError('Invalid credentials'));

// INCORRECT - reveals details
return err(new Error(`User ${userId} not found in database`));
```

## Performance Considerations

### Result Pattern Overhead

The Result pattern has minimal overhead:

- Type-safe without runtime cost
- Lazy evaluation (no computation until unwrap)
- No exception handling overhead

### UUID Generation

- `Uuid.random()` uses crypto.randomUUID (native, fast)
- Can generate thousands per second without issue
- Safe for high-throughput scenarios

### Event Publishing

Domain events are stored in-memory during aggregate lifecycle:

- No performance penalty for event emission
- Events published only after successful persistence
- Use `clearDomainEvents()` to release memory for long-lived aggregates

## Future Enhancements

1. **Event Versioning** - Support event schema evolution
2. **Event Sourcing** - Full event store implementation
3. **CQRS** - Separate command and query models
4. **Snapshot Pattern** - Cache aggregate snapshots
5. **Distributed Events** - Cross-service event publishing
6. **Event Replay** - Reconstruct aggregate state
7. **Saga Pattern** - Distributed transactions
8. **Circuit Breaker** - Resilient error handling

## Related Documentation

- [Root AGENTS.md](../../AGENTS.md) - Architecture overview
- All other context AGENTS.md files inherit these patterns

## Testing Strategy

### Unit Tests

```bash
npm run test:unit -- src/context/shared/**/*.spec.ts
```

Test shared utilities directly:

- Result pattern behavior (ok, err, map, flatMap, etc.)
- UUID generation and validation
- Value object equality
- Domain event collection
- Error hierarchy

### Integration Tests

Shared utilities are primarily tested at context level through integration tests of other contexts.

### Testing Result Types

```typescript
// Test successful result
const result = ok(someValue);
expect(result.isOk()).toBe(true);
expect(result.unwrap()).toBe(someValue);

// Test error result
const error = err(new SomeError());
expect(result.isErr()).toBe(true);
expect(result.unwrapErr()).toBeInstanceOf(SomeError);

// Test transformation
const mapped = result.map((val) => val * 2);
expect(mapped.unwrap()).toBe(expectedValue);
```

## Troubleshooting

### "Cannot read property 'value' of null"

- You called `unwrap()` on an `Err` result
- Always check `isOk()` or `isErr()` before unwrapping

### Events not publishing

- Did you forget to call `aggregate.commit()`?
- Check event handler is registered in module
- Verify `@EventsHandler(YourEvent)` decorator is present

### Value object equality fails

- Ensure `equals()` is implemented
- Use `vo1.equals(vo2)` instead of `vo1 === vo2`

### Result type errors

- Use `Result<T, E>` not `Promise<T>`
- Import from correct path: `src/context/shared/domain/result`
