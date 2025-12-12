# Value Objects

## Descripción

Objetos inmutables que representan conceptos del dominio con validación incorporada.

## Referencia
`src/context/shared/domain/primitive-value-object.ts`

## Clase Base

```typescript
export abstract class PrimitiveValueObject<T> {
  constructor(protected readonly _value: T) {}

  get value(): T {
    return this._value;
  }

  equals(other: PrimitiveValueObject<T>): boolean {
    return this._value === other._value;
  }
}
```

## Tipos de Value Objects

### String Value Object

```typescript
export class CompanyName extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): CompanyName {
    if (!value || value.trim().length === 0) {
      throw new InvalidCompanyNameError('El nombre no puede estar vacío');
    }
    if (value.length > 255) {
      throw new InvalidCompanyNameError('El nombre es demasiado largo');
    }
    return new CompanyName(value.trim());
  }
}
```

### Enum Value Object

```typescript
export class ChatStatus extends PrimitiveValueObject<string> {
  private static readonly VALID_VALUES = ['PENDING', 'ASSIGNED', 'ACTIVE', 'CLOSED'];

  private constructor(value: string) {
    super(value);
  }

  static create(value: string): ChatStatus {
    if (!this.VALID_VALUES.includes(value)) {
      throw new InvalidChatStatusError(value);
    }
    return new ChatStatus(value);
  }

  // Factory methods semánticos
  static pending(): ChatStatus {
    return new ChatStatus('PENDING');
  }

  static assigned(): ChatStatus {
    return new ChatStatus('ASSIGNED');
  }

  // Métodos de consulta
  isPending(): boolean {
    return this._value === 'PENDING';
  }

  isClosed(): boolean {
    return this._value === 'CLOSED';
  }
}
```

### UUID Value Object

```typescript
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

export class ChatId extends Uuid {
  // Hereda: random(), create(), validate(), value, equals()
}
```

### Complex Value Object

```typescript
export class VisitorInfo {
  private constructor(
    private readonly _name: string | null,
    private readonly _email: string | null,
    private readonly _phone: string | null,
  ) {}

  static create(data: { name?: string; email?: string; phone?: string }): VisitorInfo {
    return new VisitorInfo(
      data.name || null,
      data.email || null,
      data.phone || null,
    );
  }

  toPrimitives(): VisitorInfoPrimitives {
    return {
      name: this._name,
      email: this._email,
      phone: this._phone,
    };
  }

  get hasContactInfo(): boolean {
    return !!(this._email || this._phone);
  }
}
```

## Reglas de Naming

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| ID | `<Entity>Id` | `ChatId`, `UserId` |
| Status | `<Entity>Status` | `ChatStatus` |
| String | `<Concept>` | `CompanyName`, `Email` |
| Complex | `<Concept>` | `VisitorInfo`, `Address` |

## Anti-patrones

- Value Objects mutables
- Validación fuera del constructor/factory
- Crear `create()` si ya existe en clase base (Uuid)
- Exponer setters
