# Domain Services

## Descripción

Interfaces para lógica de dominio que no pertenece a un único Aggregate.

## Referencia
`src/context/auth/domain/services/`

## Cuándo Usar

- Lógica que involucra múltiples Aggregates
- Operaciones que requieren servicios externos (definir interface)
- Cálculos complejos que no pertenecen a una entidad

## Estructura Base

```typescript
// Interface en domain
export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hashedPassword: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('IPasswordHasher');
```

## Ejemplo: Servicio de Asignación

```typescript
// domain/services/chat-assignment.service.ts
export interface IChatAssignmentService {
  findBestCommercial(
    companyId: CompanyId,
    criteria: AssignmentCriteria,
  ): Promise<Result<CommercialId, DomainError>>;
}

export const CHAT_ASSIGNMENT_SERVICE = Symbol('IChatAssignmentService');

// Uso en Command Handler
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

    // Usar domain service para lógica compleja
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

## Ejemplo: Validador de Dominio

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

## Registro en Módulo

```typescript
@Module({
  providers: [
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,  // Implementación en infrastructure
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

## Reglas de Naming

| Elemento | Patrón | Ejemplo |
|----------|--------|---------|
| Interface | `I<Name>Service` | `IPasswordHasher` |
| Symbol | `<NAME>_SERVICE` o `<NAME>` | `PASSWORD_HASHER` |
| Archivo | `<name>.service.ts` | `password-hasher.service.ts` |

## Anti-patrones

- Lógica que pertenece a un Aggregate
- Implementación en domain (solo interfaces)
- Domain Services que acceden directamente a BD
- Olvidar exportar el Symbol
