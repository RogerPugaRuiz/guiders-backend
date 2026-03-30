# Optional Pattern

## Description

Wrapper for values that can be null/undefined in a safe way.

## Reference
`src/context/shared/domain/optional.ts`

## Base Structure

```typescript
// Create Optional
const present = Optional.of(value);           // Present value (error if null)
const nullable = Optional.ofNullable(value);  // Accepts null/undefined
const empty = Optional.empty<T>();            // No value
```

## Main Methods

```typescript
const optional: Optional<User> = Optional.ofNullable(user);

// Check presence
if (optional.isPresent()) {
  const user = optional.get();  // Safe after isPresent()
}

if (optional.isEmpty()) {
  // Handle absence
}

// Default value
const value = optional.orElse(defaultUser);
const computed = optional.orElseGet(() => createDefaultUser());
```

## Transformations

```typescript
// map - transform if present
const name = optional.map(user => user.name);  // Optional<string>

// flatMap - for nested Optionals
const role = optional.flatMap(user => findRole(user.roleId));

// filter - filter by predicate
const active = optional.filter(user => user.isActive);
```

## Usage in Queries

```typescript
async findByEmail(email: string): Promise<Optional<User>> {
  const entity = await this.model.findOne({ email });

  if (!entity) {
    return Optional.empty();
  }

  return Optional.of(this.mapper.toDomain(entity));
}

// In the handler
const userOpt = await this.repository.findByEmail(email);

return userOpt
  .map(user => UserDto.fromDomain(user))
  .orElse(null);
```

## Anti-patterns

- Using `get()` without checking `isPresent()` first
- Using `Optional.of()` with potentially null values
- Unnecessarily nesting Optionals
