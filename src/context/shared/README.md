# Contexto Shared

Este contexto contiene elementos compartidos entre los distintos contextos, siguiendo DDD y CQRS con NestJS v11 y @nestjs/cqrs.

## Estructura

- **domain/**: Value objects, errores y utilidades de dominio compartidas.
  - **value-objects/**: Objetos de valor reutilizables.
  - **errors/**: Errores de dominio comunes.
  - **utils/**: Utilidades compartidas.
- **infrastructure/**: Implementaciones compartidas de infraestructura.
  - **persistence/**: Adaptadores de persistencia generales.
  - **services/**: Servicios de infraestructura reutilizables.

## Principios

- **DDD**: Modela conceptos transversales reutilizables en otros contextos.
- **CQRS**: Aplica separación de comandos y queries cuando es relevante.
- **Inmutabilidad**: Los value objects son inmutables y encapsulan reglas de validación.

## Componentes principales

### Value Objects

El contexto shared proporciona value objects comunes que pueden ser utilizados en todos los demás contextos:

```typescript
// Ejemplo de UUID compartido
export class Uuid {
  private constructor(private readonly value: string) {
    this.ensureIsValidUuid(value);
  }

  static create(value?: string): Uuid {
    return new Uuid(value || randomUUID());
  }

  toString(): string {
    return this.value;
  }

  private ensureIsValidUuid(id: string): void {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new InvalidArgumentError(`<${id}> is not a valid UUID`);
    }
  }
}
```

### Result y Either

Para manejar errores de forma funcional y evitar excepciones, se proporciona la clase `Result`:

```typescript
export class Result<T, E extends Error> {
  private constructor(
    private readonly _isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: E,
  ) {}

  static success<T, E extends Error>(value: T): Result<T, E> {
    return new Result<T, E>(true, value);
  }

  static failure<T, E extends Error>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  isSuccess(): boolean {
    return this._isSuccess;
  }

  isFailure(): boolean {
    return !this._isSuccess;
  }

  value(): T {
    if (!this._isSuccess) {
      throw new Error('Cannot get value from failure result');
    }
    return this._value as T;
  }

  error(): E {
    if (this._isSuccess) {
      throw new Error('Cannot get error from success result');
    }
    return this._error as E;
  }
}
```

## Ejemplos de uso

### Uso de Uuid

```typescript
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

export class TrackingEventId {
  private constructor(private readonly value: Uuid) {}

  static create(value?: string): TrackingEventId {
    return new TrackingEventId(Uuid.create(value));
  }

  toString(): string {
    return this.value.toString();
  }
}
```

### Uso de Result

```typescript
import { Result } from 'src/context/shared/domain/result';
import { UserNotFoundError } from './errors/user-not-found.error';

export class FindUserByIdQueryHandler implements IQueryHandler<FindUserByIdQuery> {
  constructor(private readonly repository: UserRepository) {}

  async execute(query: FindUserByIdQuery): Promise<Result<UserDto, UserNotFoundError>> {
    const userId = UserId.create(query.id);
    const user = await this.repository.findById(userId);
    
    if (!user) {
      return Result.failure(new UserNotFoundError(userId.toString()));
    }
    
    return Result.success(UserMapper.toDto(user));
  }
}
```

## Intención

Facilita la reutilización y consistencia de conceptos comunes en toda la arquitectura, evitando duplicidad y promoviendo buenas prácticas.

## Mejores prácticas

- Utilizar siempre los value objects del contexto shared en lugar de implementar soluciones específicas en cada contexto.
- Mantener el contexto shared lo más pequeño y enfocado posible, incluyendo solo elementos realmente transversales.
- No incluir lógica de negocio específica de un dominio particular en el contexto shared.
- Aplicar validaciones estrictas en los constructores de los value objects para garantizar su integridad.
