# Domain Services

## Description

Interfaces for domain logic that doesn't belong to a single Aggregate.

## Reference
`src/context/auth/domain/services/`

## When to Use

- Logic involving multiple Aggregates
- Operations requiring external services (define interface)
- Complex calculations that don't belong to an entity

## Base Structure

```typescript
// Interface in domain
export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hashedPassword: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('IPasswordHasher');
```

## Example: Assignment Service

```typescript
// domain/services/chat-assignment.service.ts
export interface IChatAssignmentService {
  findBestCommercial(
    companyId: CompanyId,
    criteria: AssignmentCriteria,
  ): Promise<Result<CommercialId, DomainError>>;
}

export const CHAT_ASSIGNMENT_SERVICE = Symbol('IChatAssignmentService');

// Usage in Command Handler
@CommandHandler(AutoAssignChatCommand)
export class AutoAssignChatCommandHandler {
  constructor(
    @Inject(CHAT_REPOSITORY) private chatRepo: IChatRepository,
    @Inject(CHAT_ASSIGNMENT_SERVICE) private assignmentService: IChatAssignmentService,
    private publisher: EventPublisher,
  ) {}

  async execute(command: AutoAssignChatCommand): Promise<Result<void, DomainError>> {
    const chatResult = await this.chatRepo.findById(ChatId.create(command.chatId));
    if (chatResult.isErr()) return chatResult;

    const chat = chatResult.unwrap();

    // Use domain service for complex logic
    const commercialResult = await this.assignmentService.findBestCommercial(
      chat.getCompanyId(),
      { priority: command.priority },
    );

    if (commercialResult.isErr()) return commercialResult;

    const chatCtx = this.publisher.mergeObjectContext(chat);
    const assignResult = chatCtx.assignToCommercial(commercialResult.unwrap());

    if (assignResult.isErr()) return assignResult;

    await this.chatRepo.update(chatCtx);
    chatCtx.commit();

    return okVoid();
  }
}
```

## Example: Domain Validator

```typescript
export interface IApiKeyValidator {
  validate(apiKey: string, domain: string): Promise<Result<ValidatedApiKey, DomainError>>;
}

export const API_KEY_VALIDATOR = Symbol('IApiKeyValidator');

interface ValidatedApiKey {
  companyId: string;
  siteId: string;
  permissions: string[];
}
```

## Module Registration

```typescript
@Module({
  providers: [
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,  // Implementation in infrastructure
    },
    {
      provide: CHAT_ASSIGNMENT_SERVICE,
      useClass: RoundRobinAssignmentService,
    },
  ],
  exports: [PASSWORD_HASHER, CHAT_ASSIGNMENT_SERVICE],
})
export class DomainServicesModule {}
```

## Naming Rules

| Element | Pattern | Example |
|---------|---------|---------|
| Interface | `I<Name>Service` | `IPasswordHasher` |
| Symbol | `<NAME>_SERVICE` or `<NAME>` | `PASSWORD_HASHER` |
| File | `<name>.service.ts` | `password-hasher.service.ts` |

## Anti-patterns

- Logic that belongs to an Aggregate
- Implementation in domain (interfaces only)
- Domain Services accessing DB directly
- Forgetting to export the Symbol
