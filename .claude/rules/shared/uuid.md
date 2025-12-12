# Uuid Value Object

## Descripción

Value Object base para identificadores únicos UUID v4.

## Referencia
`src/context/shared/domain/value-objects/uuid.ts`

## Estructura Base

```typescript
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

export class ChatId extends Uuid {
  // Heredar sin modificaciones es suficiente
}
```

## Métodos Disponibles

```typescript
// Generar nuevo UUID
const id = ChatId.random();

// Crear desde string existente
const id = ChatId.create('550e8400-e29b-41d4-a716-446655440000');

// Validar formato
const isValid = ChatId.validate('550e8400-e29b-41d4-a716-446655440000'); // true
const isInvalid = ChatId.validate('invalid-uuid'); // false

// Acceder al valor
const value: string = id.value;

// Comparar
const areEqual = id1.equals(id2);
```

## Uso en Aggregates

```typescript
export class Chat extends AggregateRoot {
  private constructor(
    private readonly _id: ChatId,
    // ...
  ) { super(); }

  static create(visitorId: VisitorId): Chat {
    const id = ChatId.random();  // Generar nuevo
    return new Chat(id, /* ... */);
  }

  static fromPrimitives(data: ChatPrimitives): Chat {
    return new Chat(
      ChatId.create(data.id),  // Rehidratar existente
      // ...
    );
  }

  getId(): ChatId {
    return this._id;
  }
}
```

## Tipos Comunes de IDs

| Clase | Contexto | Uso |
|-------|----------|-----|
| `ChatId` | conversations-v2 | Identificador de chat |
| `MessageId` | conversations-v2 | Identificador de mensaje |
| `VisitorId` | visitors-v2 | Identificador de visitante |
| `CompanyId` | company | Identificador de empresa |
| `UserId` | auth | Identificador de usuario |
| `SiteId` | company | Identificador de sitio |

## Anti-patrones

- Usar strings directamente en lugar de Uuid tipados
- Crear método `create()` si ya existe en clase base
- UUIDs falsos en tests (usar `Uuid.random().value`)
