# Commands

## Descripción

Operaciones de escritura que modifican el estado del sistema.

## Referencia
`src/context/company/application/commands/create-company-command.handler.ts`

## Estructura del Command

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
    // 1. Crear aggregate (emite eventos internamente)
    const chat = Chat.create(
      VisitorId.create(command.visitorId),
      CompanyId.create(command.companyId),
    );

    // 2. CRÍTICO: mergeObjectContext para habilitar commit()
    const chatCtx = this.publisher.mergeObjectContext(chat);

    // 3. Persistir
    const saveResult = await this.chatRepository.save(chatCtx);
    if (saveResult.isErr()) {
      return err(saveResult.error());
    }

    // 4. CRÍTICO: commit() publica los eventos
    chatCtx.commit();

    return ok(chat.getId().value);
  }
}
```

## Patrón para Modificaciones

```typescript
@CommandHandler(AssignChatCommand)
export class AssignChatCommandHandler implements ICommandHandler<AssignChatCommand> {
  async execute(command: AssignChatCommand): Promise<Result<void, DomainError>> {
    // 1. Buscar aggregate existente
    const chatResult = await this.chatRepository.findById(
      ChatId.create(command.chatId),
    );
    if (chatResult.isErr()) {
      return chatResult;
    }

    const chat = chatResult.unwrap();

    // 2. Merge context
    const chatCtx = this.publisher.mergeObjectContext(chat);

    // 3. Ejecutar operación de negocio
    const assignResult = chatCtx.assignToCommercial(
      CommercialId.create(command.commercialId),
    );
    if (assignResult.isErr()) {
      return assignResult;
    }

    // 4. Persistir cambios
    const updateResult = await this.chatRepository.update(chatCtx);
    if (updateResult.isErr()) {
      return updateResult;
    }

    // 5. Publicar eventos
    chatCtx.commit();

    return okVoid();
  }
}
```

## Registro en Módulo

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

## Reglas de Naming

| Elemento | Patrón | Ejemplo |
|----------|--------|---------|
| Command | `<Action><Entity>Command` | `CreateChatCommand` |
| Handler | `<Action><Entity>CommandHandler` | `CreateChatCommandHandler` |
| Archivo | `<action>-<entity>-command.handler.ts` | `create-chat-command.handler.ts` |

## Anti-patrones

- Olvidar `mergeObjectContext()` antes de save
- Olvidar `commit()` después de save exitoso
- Lógica de negocio en el handler (delegar a aggregate)
- Retornar void en lugar de Result
