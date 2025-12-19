# Domain Events

## Description

Events that represent facts that occurred in the domain.

## Reference
`src/context/conversations-v2/domain/events/chat-created.event.ts`

## Base Structure

```typescript
export class ChatCreatedEvent {
  constructor(
    public readonly chatId: string,
    public readonly visitorId: string,
    public readonly companyId: string,
    public readonly createdAt: string,
  ) {}
}
```

## Emitting in Aggregate

```typescript
export class Chat extends AggregateRoot {
  static create(visitorId: VisitorId, companyId: CompanyId): Chat {
    const chat = new Chat(/* ... */);

    // Emit event (queued, not published yet)
    chat.apply(new ChatCreatedEvent(
      chat._id.value,
      visitorId.value,
      companyId.value,
      chat._createdAt.toISOString(),
    ));

    return chat;
  }

  assignToCommercial(commercialId: CommercialId): Result<void, DomainError> {
    // ... validations ...

    this.apply(new ChatAssignedEvent({
      chatId: this._id.value,
      commercialId: commercialId.value,
      assignedAt: new Date().toISOString(),
    }));

    return okVoid();
  }
}
```

## Publishing with commit()

```typescript
@CommandHandler(CreateChatCommand)
export class CreateChatCommandHandler {
  constructor(
    @Inject(CHAT_REPOSITORY) private repository: IChatRepository,
    private publisher: EventPublisher,
  ) {}

  async execute(command: CreateChatCommand): Promise<Result<string, DomainError>> {
    const chat = Chat.create(command.visitorId, command.companyId);

    // CRITICAL: mergeObjectContext enables commit()
    const chatCtx = this.publisher.mergeObjectContext(chat);

    const saveResult = await this.repository.save(chatCtx);
    if (saveResult.isErr()) {
      return saveResult;
    }

    // CRITICAL: without commit() events are NOT published
    chatCtx.commit();

    return ok(chat.getId().value);
  }
}
```

## Event Data Pattern

```typescript
// Option 1: Individual parameters
export class ChatCreatedEvent {
  constructor(
    public readonly chatId: string,
    public readonly visitorId: string,
  ) {}
}

// Option 2: Data object (recommended for many fields)
export class ChatAssignedEvent {
  constructor(public readonly data: ChatAssignedEventData) {}

  get chatId(): string { return this.data.chatId; }
  get commercialId(): string { return this.data.commercialId; }
}

interface ChatAssignedEventData {
  chatId: string;
  commercialId: string;
  assignedAt: string;
}
```

## Naming Rules

| Element | Pattern | Example |
|---------|---------|---------|
| Event | `<Entity><Action>Event` | `ChatCreatedEvent` |
| File | `<entity>-<action>.event.ts` | `chat-created.event.ts` |

## Anti-patterns

- Forgetting `mergeObjectContext()` before save
- Forgetting `commit()` after successful save
- Events with business logic
- Mutable events
