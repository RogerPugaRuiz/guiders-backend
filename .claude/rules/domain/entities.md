# Domain Entities (Aggregates)

## Descripción

Aggregates que encapsulan lógica de negocio y emiten eventos de dominio.

## Referencia
`src/context/conversations-v2/domain/entities/chat.aggregate.ts`

## Estructura Base

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

  // Factory CON eventos (crear nuevo)
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

  // Factory SIN eventos (rehidratar)
  static fromPrimitives(data: ChatPrimitives): Chat {
    return new Chat(
      ChatId.create(data.id),
      ChatStatus.create(data.status),
      VisitorId.create(data.visitorId),
      CompanyId.create(data.companyId),
      new Date(data.createdAt),
    );
  }

  // Serialización
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

## Métodos de Negocio

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

## Reglas de Naming

| Elemento | Patrón | Ejemplo |
|----------|--------|---------|
| Aggregate | `<Entity>` o `<Entity>Aggregate` | `Chat`, `ChatAggregate` |
| Archivo | `<entity>.aggregate.ts` | `chat.aggregate.ts` |
| Primitives | `<Entity>Primitives` | `ChatPrimitives` |

## Anti-patrones

- Constructor público (usar factories)
- Setters públicos (usar métodos de negocio)
- Lógica sin validación de estado
- Olvidar emitir eventos en cambios de estado
