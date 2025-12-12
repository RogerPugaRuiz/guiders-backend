# Result Pattern

## Descripción

Manejo de errores sin excepciones usando `Result<T, E>`.

## Referencia
`src/context/shared/domain/result.ts`

## Estructura Base

```typescript
type Result<T, E> = Ok<T> | Err<E>;

// Crear resultados exitosos
const success = ok(value);        // Result<T, never>
const voidSuccess = okVoid();     // Result<void, never>

// Crear resultados de error
const failure = err(error);       // Result<never, E>
```

## Métodos Principales

```typescript
const result: Result<User, DomainError> = await findUser(id);

// Verificar estado
if (result.isOk()) {
  const user = result.unwrap();   // Seguro después de isOk()
}

if (result.isErr()) {
  const error = result.error();   // Acceso al error
}

// Transformaciones
const mapped = result.map(user => user.name);           // Result<string, E>
const flatMapped = result.flatMap(user => findRole(user.roleId));
```

## Uso en Repositorios

```typescript
async findById(id: UserId): Promise<Result<User, DomainError>> {
  try {
    const entity = await this.model.findOne({ id: id.value });
    if (!entity) {
      return err(new UserNotFoundError(id.value));
    }
    return ok(this.mapper.toDomain(entity));
  } catch (error) {
    return err(new UserPersistenceError(error.message));
  }
}
```

## Uso en Command Handlers

```typescript
async execute(command: CreateUserCommand): Promise<Result<string, DomainError>> {
  const userResult = await this.repository.findByEmail(command.email);

  if (userResult.isOk()) {
    return err(new UserAlreadyExistsError(command.email));
  }

  const user = User.create(command.email, command.name);
  const saveResult = await this.repository.save(user);

  if (saveResult.isErr()) {
    return saveResult;
  }

  return ok(user.getId().value);
}
```

## Anti-patrones

- Usar `unwrap()` sin verificar `isOk()` primero
- Lanzar excepciones en lugar de retornar `err()`
- Ignorar el resultado de operaciones que pueden fallar
