# Domain Entities (Aggregates)

## Description

Aggregates that encapsulate business logic and emit domain events.

## Reference
`src/context/conversations-v2/domain/entities/chat.aggregate.ts`

## Base Structure

```typescript
import { AggregateRoot } from '@nestjs/cqrs';

export class Chat extends AggregateRoot {
  private constructor(
    private readonly _id: ChatId,
    private _status: ChatStatus,
    private readonly _visitorId: VisitorId,
    private readonly _companyId: CompanyId,
    private readonly _createdAt: Date,
  ) {
    super();
  }

  // Factory WITH events (create new)
  static create(visitorId: VisitorId, companyId: CompanyId): Chat {
    const chat = new Chat(
      ChatId.random(),
      ChatStatus.pending(),
      visitorId,
      companyId,
      new Date(),
    );
    chat.apply(new ChatCreatedEvent(chat.toPrimitives()));
    return chat;
  }

  // Factory WITHOUT events (rehydrate)
  static fromPrimitives(data: ChatPrimitives): Chat {
    return new Chat(
      ChatId.create(data.id),
      ChatStatus.create(data.status),
      VisitorId.create(data.visitorId),
      CompanyId.create(data.companyId),
      new Date(data.createdAt),
    );
  }

  // Serialization
  toPrimitives(): ChatPrimitives {
    return {
      id: this._id.value,
      status: this._status.value,
      visitorId: this._visitorId.value,
      companyId: this._companyId.value,
      createdAt: this._createdAt.toISOString(),
    };
  }
}
```

## Business Methods

```typescript
assignToCommercial(commercialId: CommercialId): Result<void, DomainError> {
  if (this._status.isClosed()) {
    return err(new ChatAlreadyClosedError(this._id.value));
  }

  this._status = ChatStatus.assigned();
  this._assignedCommercialId = commercialId;

  this.apply(new ChatAssignedEvent({
    chatId: this._id.value,
    commercialId: commercialId.value,
  }));

  return okVoid();
}

close(reason: CloseReason): Result<void, DomainError> {
  if (this._status.isClosed()) {
    return err(new ChatAlreadyClosedError(this._id.value));
  }

  this._status = ChatStatus.closed();
  this._closedAt = new Date();

  this.apply(new ChatClosedEvent({
    chatId: this._id.value,
    reason: reason.value,
  }));

  return okVoid();
}
```

## Naming Rules

| Element | Pattern | Example |
|---------|---------|---------|
| Aggregate | `<Entity>` or `<Entity>Aggregate` | `Chat`, `ChatAggregate` |
| File | `<entity>.aggregate.ts` | `chat.aggregate.ts` |
| Primitives | `<Entity>Primitives` | `ChatPrimitives` |

## Anti-patterns

- Public constructor (use factories)
- Public setters (use business methods)
- Logic without state validation
- Forgetting to emit events on state changes
