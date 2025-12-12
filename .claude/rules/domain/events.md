# Domain Events

## Descripción

Eventos que representan hechos ocurridos en el dominio.

## Referencia
`src/context/conversations-v2/domain/events/chat-created.event.ts`

## Estructura Base

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

## Emisión en Aggregate

```typescript
export class Chat extends AggregateRoot {
  static create(visitorId: VisitorId, companyId: CompanyId): Chat {
    const chat = new Chat(/* ... */);

    // Emitir evento (se encola, no se publica aún)
    chat.apply(new ChatCreatedEvent(
      chat._id.value,
      visitorId.value,
      companyId.value,
      chat._createdAt.toISOString(),
    ));

    return chat;
  }

  assignToCommercial(commercialId: CommercialId): Result<void, DomainError> {
    // ... validaciones ...

    this.apply(new ChatAssignedEvent({
      chatId: this._id.value,
      commercialId: commercialId.value,
      assignedAt: new Date().toISOString(),
    }));

    return okVoid();
  }
}
```

## Publicación con commit()

```typescript
@CommandHandler(CreateChatCommand)
export class CreateChatCommandHandler {
  constructor(
    @Inject(CHAT_REPOSITORY) private repository: IChatRepository,
    private publisher: EventPublisher,
  ) {}

  async execute(command: CreateChatCommand): Promise<Result<string, DomainError>> {
    const chat = Chat.create(command.visitorId, command.companyId);

    // CRÍTICO: mergeObjectContext habilita commit()
    const chatCtx = this.publisher.mergeObjectContext(chat);

    const saveResult = await this.repository.save(chatCtx);
    if (saveResult.isErr()) {
      return saveResult;
    }

    // CRÍTICO: sin commit() los eventos NO se publican
    chatCtx.commit();

    return ok(chat.getId().value);
  }
}
```

## Patrón de Datos del Evento

```typescript
// Opción 1: Parámetros individuales
export class ChatCreatedEvent {
  constructor(
    public readonly chatId: string,
    public readonly visitorId: string,
  ) {}
}

// Opción 2: Objeto de datos (recomendado para muchos campos)
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

## Reglas de Naming

| Elemento | Patrón | Ejemplo |
|----------|--------|---------|
| Evento | `<Entity><Action>Event` | `ChatCreatedEvent` |
| Archivo | `<entity>-<action>.event.ts` | `chat-created.event.ts` |

## Anti-patrones

- Olvidar `mergeObjectContext()` antes de save
- Olvidar `commit()` después de save exitoso
- Eventos con lógica de negocio
- Eventos mutables
