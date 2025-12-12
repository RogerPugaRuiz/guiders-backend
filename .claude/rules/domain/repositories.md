# Repository Interfaces

## Descripción

Interfaces de dominio para persistencia, implementadas en infraestructura.

## Referencia
`src/context/conversations-v2/domain/chat.repository.ts`

## Estructura Base

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

// Symbol para inyección de dependencias
export const CHAT_REPOSITORY = Symbol('IChatRepository');
```

## Métodos Opcionales

```typescript
export interface IChatRepository {
  // Básicos
  save(chat: Chat): Promise<Result<void, DomainError>>;
  findById(id: ChatId): Promise<Result<Chat, DomainError>>;

  // Actualización parcial (opcional)
  updateStatus(id: ChatId, status: ChatStatus): Promise<Result<void, DomainError>>;

  // Búsquedas específicas (opcional)
  findByVisitorId(visitorId: VisitorId): Promise<Result<Chat[], DomainError>>;
  findActiveByCompanyId(companyId: CompanyId): Promise<Result<Chat[], DomainError>>;

  // Existencia (opcional)
  exists(id: ChatId): Promise<Result<boolean, DomainError>>;
}
```

## Uso con Criteria

```typescript
// En Query Handler
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

## Registro en Módulo

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

// En Command Handler
@CommandHandler(CreateChatCommand)
export class CreateChatCommandHandler {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}
}
```

## Reglas de Naming

| Elemento | Patrón | Ejemplo |
|----------|--------|---------|
| Interface | `I<Entity>Repository` | `IChatRepository` |
| Symbol | `<ENTITY>_REPOSITORY` | `CHAT_REPOSITORY` |
| Archivo | `<entity>.repository.ts` | `chat.repository.ts` |

## Anti-patrones

- Métodos que retornan entities de persistencia
- Lógica de negocio en la interface
- Métodos sin Result pattern
- Olvidar exportar el Symbol
