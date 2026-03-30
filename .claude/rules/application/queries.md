# Queries

## Description

Read operations that don't modify state, return DTOs.

## Reference
`src/context/company/application/queries/find-company-by-domain.query-handler.ts`

## Query Structure

```typescript
export class FindChatByIdQuery {
  constructor(public readonly chatId: string) {}
}

export class FindChatsByCompanyQuery {
  constructor(
    public readonly companyId: string,
    public readonly status?: string,
    public readonly limit: number = 20,
    public readonly offset: number = 0,
  ) {}
}
```

## Query Handler

```typescript
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';

@QueryHandler(FindChatByIdQuery)
export class FindChatByIdQueryHandler implements IQueryHandler<FindChatByIdQuery> {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async execute(query: FindChatByIdQuery): Promise<Result<ChatDto, DomainError>> {
    const chatResult = await this.chatRepository.findById(
      ChatId.create(query.chatId),
    );

    if (chatResult.isErr()) {
      return chatResult;
    }

    // Map to DTO before returning
    return ok(ChatDto.fromDomain(chatResult.unwrap()));
  }
}
```

## Query with Criteria

```typescript
@QueryHandler(FindChatsByCompanyQuery)
export class FindChatsByCompanyQueryHandler implements IQueryHandler<FindChatsByCompanyQuery> {
  async execute(query: FindChatsByCompanyQuery): Promise<Result<ChatListDto, DomainError>> {
    const criteria = Criteria.create<Chat>()
      .addFilter('companyId', Operator.EQUALS, query.companyId);

    if (query.status) {
      criteria.addFilter('status', Operator.EQUALS, query.status);
    }

    criteria
      .orderBy('createdAt', OrderDirection.DESC)
      .limit(query.limit)
      .offset(query.offset);

    const chatsResult = await this.chatRepository.match(criteria);
    if (chatsResult.isErr()) {
      return chatsResult;
    }

    const countResult = await this.chatRepository.count(criteria);
    if (countResult.isErr()) {
      return countResult;
    }

    return ok(ChatListDto.create(
      chatsResult.unwrap().map(ChatDto.fromDomain),
      countResult.unwrap(),
      query.limit,
      query.offset,
    ));
  }
}
```

## Response DTOs

```typescript
export class ChatDto {
  id: string;
  status: string;
  visitorId: string;
  createdAt: string;

  static fromDomain(chat: Chat): ChatDto {
    const primitives = chat.toPrimitives();
    const dto = new ChatDto();
    dto.id = primitives.id;
    dto.status = primitives.status;
    dto.visitorId = primitives.visitorId;
    dto.createdAt = primitives.createdAt;
    return dto;
  }
}

export class ChatListDto {
  items: ChatDto[];
  total: number;
  limit: number;
  offset: number;

  static create(items: ChatDto[], total: number, limit: number, offset: number): ChatListDto {
    const dto = new ChatListDto();
    dto.items = items;
    dto.total = total;
    dto.limit = limit;
    dto.offset = offset;
    return dto;
  }
}
```

## Naming Rules

| Element | Pattern | Example |
|---------|---------|---------|
| Query | `Find<Entity>By<Criteria>Query` | `FindChatByIdQuery` |
| Handler | `Find<Entity>By<Criteria>QueryHandler` | `FindChatByIdQueryHandler` |
| File | `find-<entity>-by-<criteria>.query-handler.ts` | `find-chat-by-id.query-handler.ts` |

## Anti-patterns

- Returning domain entities (use DTOs)
- Modifying state in queries
- Queries without pagination for large lists
- Business logic in query handlers
