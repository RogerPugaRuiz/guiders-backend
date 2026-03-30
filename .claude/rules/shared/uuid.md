# Uuid Value Object

## Description

Base Value Object for unique UUID v4 identifiers.

## Reference
`src/context/shared/domain/value-objects/uuid.ts`

## Base Structure

```typescript
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

export class ChatId extends Uuid {
  // Inheriting without modifications is sufficient
}
```

## Available Methods

```typescript
// Generate new UUID
const id = ChatId.random();

// Create from existing string
const id = ChatId.create('550e8400-e29b-41d4-a716-446655440000');

// Validate format
const isValid = ChatId.validate('550e8400-e29b-41d4-a716-446655440000'); // true
const isInvalid = ChatId.validate('invalid-uuid'); // false

// Access value
const value: string = id.value;

// Compare
const areEqual = id1.equals(id2);
```

## Usage in Aggregates

```typescript
export class Chat extends AggregateRoot {
  private constructor(
    private readonly _id: ChatId,
    // ...
  ) { super(); }

  static create(visitorId: VisitorId): Chat {
    const id = ChatId.random();  // Generate new
    return new Chat(id, /* ... */);
  }

  static fromPrimitives(data: ChatPrimitives): Chat {
    return new Chat(
      ChatId.create(data.id),  // Rehydrate existing
      // ...
    );
  }

  getId(): ChatId {
    return this._id;
  }
}
```

## Common ID Types

| Class | Context | Usage |
|-------|---------|-------|
| `ChatId` | conversations-v2 | Chat identifier |
| `MessageId` | conversations-v2 | Message identifier |
| `VisitorId` | visitors-v2 | Visitor identifier |
| `CompanyId` | company | Company identifier |
| `UserId` | auth | User identifier |
| `SiteId` | company | Site identifier |

## Anti-patterns

- Using strings directly instead of typed Uuids
- Creating `create()` method if it already exists in base class
- Fake UUIDs in tests (use `Uuid.random().value`)
