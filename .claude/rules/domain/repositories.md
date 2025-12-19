# Repository Interfaces

## Description

Domain interfaces for persistence, implemented in infrastructure.

## Reference
`src/context/conversations-v2/domain/chat.repository.ts`

## Base Structure

```typescript
import { Result } from 'src/context/shared/domain/result';
import { Criteria } from 'src/context/shared/domain/criteria/criteria';

export interface IChatRepository {
  save(chat: Chat): Promise<Result<void, DomainError>>;
  findById(id: ChatId): Promise<Result<Chat, DomainError>>;
  update(chat: Chat): Promise<Result<void, DomainError>>;
  delete(id: ChatId): Promise<Result<void, DomainError>>;
  match(criteria: Criteria<Chat>): Promise<Result<Chat[], DomainError>>;
  count(criteria: Criteria<Chat>): Promise<Result<number, DomainError>>;
}

// Symbol for dependency injection
export const CHAT_REPOSITORY = Symbol('IChatRepository');
```

## Optional Methods

```typescript
export interface IChatRepository {
  // Basic
  save(chat: Chat): Promise<Result<void, DomainError>>;
  findById(id: ChatId): Promise<Result<Chat, DomainError>>;

  // Partial update (optional)
  updateStatus(id: ChatId, status: ChatStatus): Promise<Result<void, DomainError>>;

  // Specific searches (optional)
  findByVisitorId(visitorId: VisitorId): Promise<Result<Chat[], DomainError>>;
  findActiveByCompanyId(companyId: CompanyId): Promise<Result<Chat[], DomainError>>;

  // Existence (optional)
  exists(id: ChatId): Promise<Result<boolean, DomainError>>;
}
```

## Usage with Criteria

```typescript
// In Query Handler
async execute(query: FindChatsQuery): Promise<Result<ChatDto[], DomainError>> {
  const criteria = Criteria.create<Chat>()
    .addFilter('companyId', Operator.EQUALS, query.companyId)
    .addFilter('status', Operator.IN, ['ACTIVE', 'ASSIGNED'])
    .orderBy('createdAt', OrderDirection.DESC)
    .limit(query.limit)
    .offset(query.offset);

  const chatsResult = await this.chatRepository.match(criteria);

  if (chatsResult.isErr()) {
    return chatsResult;
  }

  return ok(chatsResult.unwrap().map(ChatDto.fromDomain));
}
```

## Module Registration

```typescript
@Module({
  providers: [
    {
      provide: CHAT_REPOSITORY,
      useClass: MongoChatRepositoryImpl,
    },
  ],
  exports: [CHAT_REPOSITORY],
})
export class ChatInfrastructureModule {}

// In Command Handler
@CommandHandler(CreateChatCommand)
export class CreateChatCommandHandler {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}
}
```

## Naming Rules

| Element | Pattern | Example |
|---------|---------|---------|
| Interface | `I<Entity>Repository` | `IChatRepository` |
| Symbol | `<ENTITY>_REPOSITORY` | `CHAT_REPOSITORY` |
| File | `<entity>.repository.ts` | `chat.repository.ts` |

## Anti-patterns

- Methods that return persistence entities
- Business logic in the interface
- Methods without Result pattern
- Forgetting to export the Symbol
