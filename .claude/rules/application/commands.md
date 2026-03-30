# Commands

## Description

Write operations that modify system state.

## Reference
`src/context/company/application/commands/create-company-command.handler.ts`

## Command Structure

```typescript
export class CreateChatCommand {
  constructor(
    public readonly visitorId: string,
    public readonly companyId: string,
    public readonly siteId: string,
  ) {}
}
```

## Command Handler

```typescript
import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';

@CommandHandler(CreateChatCommand)
export class CreateChatCommandHandler implements ICommandHandler<CreateChatCommand> {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: CreateChatCommand): Promise<Result<string, DomainError>> {
    // 1. Create aggregate (emits events internally)
    const chat = Chat.create(
      VisitorId.create(command.visitorId),
      CompanyId.create(command.companyId),
    );

    // 2. CRITICAL: mergeObjectContext to enable commit()
    const chatCtx = this.publisher.mergeObjectContext(chat);

    // 3. Persist
    const saveResult = await this.chatRepository.save(chatCtx);
    if (saveResult.isErr()) {
      return err(saveResult.error());
    }

    // 4. CRITICAL: commit() publishes the events
    chatCtx.commit();

    return ok(chat.getId().value);
  }
}
```

## Pattern for Modifications

```typescript
@CommandHandler(AssignChatCommand)
export class AssignChatCommandHandler implements ICommandHandler<AssignChatCommand> {
  async execute(command: AssignChatCommand): Promise<Result<void, DomainError>> {
    // 1. Find existing aggregate
    const chatResult = await this.chatRepository.findById(
      ChatId.create(command.chatId),
    );
    if (chatResult.isErr()) {
      return chatResult;
    }

    const chat = chatResult.unwrap();

    // 2. Merge context
    const chatCtx = this.publisher.mergeObjectContext(chat);

    // 3. Execute business operation
    const assignResult = chatCtx.assignToCommercial(
      CommercialId.create(command.commercialId),
    );
    if (assignResult.isErr()) {
      return assignResult;
    }

    // 4. Persist changes
    const updateResult = await this.chatRepository.update(chatCtx);
    if (updateResult.isErr()) {
      return updateResult;
    }

    // 5. Publish events
    chatCtx.commit();

    return okVoid();
  }
}
```

## Module Registration

```typescript
const CommandHandlers = [
  CreateChatCommandHandler,
  AssignChatCommandHandler,
  CloseChatCommandHandler,
];

@Module({
  imports: [CqrsModule],
  providers: [...CommandHandlers],
})
export class ChatApplicationModule {}
```

## Naming Rules

| Element | Pattern | Example |
|---------|---------|---------|
| Command | `<Action><Entity>Command` | `CreateChatCommand` |
| Handler | `<Action><Entity>CommandHandler` | `CreateChatCommandHandler` |
| File | `<action>-<entity>-command.handler.ts` | `create-chat-command.handler.ts` |

## Anti-patterns

- Forgetting `mergeObjectContext()` before save
- Forgetting `commit()` after successful save
- Business logic in the handler (delegate to aggregate)
- Returning void instead of Result
