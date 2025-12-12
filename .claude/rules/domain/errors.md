# Domain Errors

## Descripción

Errores tipados del dominio para uso con Result pattern.

## Referencia
`src/context/shared/domain/domain.error.ts`

## Clase Base

```typescript
export abstract class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
```

## Categorías de Errores

### NotFound Errors

```typescript
export class ChatNotFoundError extends DomainError {
  constructor(chatId: string) {
    super('CHAT_NOT_FOUND', `Chat con id ${chatId} no encontrado`);
  }
}

export class UserNotFoundError extends DomainError {
  constructor(identifier: string) {
    super('USER_NOT_FOUND', `Usuario ${identifier} no encontrado`);
  }
}
```

### Validation Errors

```typescript
export class InvalidChatStatusError extends DomainError {
  constructor(status: string) {
    super('INVALID_CHAT_STATUS', `Estado de chat inválido: ${status}`);
  }
}

export class InvalidEmailError extends DomainError {
  constructor(email: string) {
    super('INVALID_EMAIL', `Email inválido: ${email}`);
  }
}
```

### Business Rule Errors

```typescript
export class ChatAlreadyClosedError extends DomainError {
  constructor(chatId: string) {
    super('CHAT_ALREADY_CLOSED', `El chat ${chatId} ya está cerrado`);
  }
}

export class CommercialNotAvailableError extends DomainError {
  constructor(commercialId: string) {
    super('COMMERCIAL_NOT_AVAILABLE', `Comercial ${commercialId} no disponible`);
  }
}
```

### Persistence Errors

```typescript
export class ChatPersistenceError extends DomainError {
  constructor(message: string) {
    super('CHAT_PERSISTENCE_ERROR', `Error de persistencia: ${message}`);
  }
}
```

## Uso con Result

```typescript
// En repository
async findById(id: ChatId): Promise<Result<Chat, DomainError>> {
  const entity = await this.model.findOne({ id: id.value });

  if (!entity) {
    return err(new ChatNotFoundError(id.value));
  }

  return ok(this.mapper.toDomain(entity));
}

// En command handler
async execute(command: CloseChatCommand): Promise<Result<void, DomainError>> {
  const chatResult = await this.repository.findById(ChatId.create(command.chatId));

  if (chatResult.isErr()) {
    return chatResult;  // Propagar error
  }

  const chat = chatResult.unwrap();
  const closeResult = chat.close(CloseReason.create(command.reason));

  if (closeResult.isErr()) {
    return closeResult;  // Error de regla de negocio
  }

  return await this.repository.update(chat);
}
```

## Reglas de Naming

| Categoría | Patrón | Ejemplo |
|-----------|--------|---------|
| NotFound | `<Entity>NotFoundError` | `ChatNotFoundError` |
| Invalid | `Invalid<Concept>Error` | `InvalidEmailError` |
| BusinessRule | `<Rule>Error` | `ChatAlreadyClosedError` |
| Persistence | `<Entity>PersistenceError` | `ChatPersistenceError` |

## Anti-patrones

- Lanzar excepciones en lugar de retornar Result
- Errores genéricos sin contexto
- Códigos de error duplicados
- Mensajes en inglés (usar español)
