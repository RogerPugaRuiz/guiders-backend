# Result Pattern

## Description

Error handling without exceptions using `Result<T, E>`.

## Reference
`src/context/shared/domain/result.ts`

## Base Structure

```typescript
type Result<T, E> = Ok<T> | Err<E>;

// Create successful results
const success = ok(value);        // Result<T, never>
const voidSuccess = okVoid();     // Result<void, never>

// Create error results
const failure = err(error);       // Result<never, E>
```

## Main Methods

```typescript
const result: Result<User, DomainError> = await findUser(id);

// Check state
if (result.isOk()) {
  const user = result.unwrap();   // Safe after isOk()
}

if (result.isErr()) {
  const error = result.error();   // Access the error
}

// Transformations
const mapped = result.map(user => user.name);           // Result<string, E>
const flatMapped = result.flatMap(user => findRole(user.roleId));
```

## Usage in Repositories

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

## Usage in Command Handlers

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

## Anti-patterns

- Using `unwrap()` without checking `isOk()` first
- Throwing exceptions instead of returning `err()`
- Ignoring the result of operations that can fail
