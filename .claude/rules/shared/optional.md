# Optional Pattern

## Descripción

Wrapper para valores que pueden ser null/undefined de forma segura.

## Referencia
`src/context/shared/domain/optional.ts`

## Estructura Base

```typescript
// Crear Optional
const present = Optional.of(value);           // Valor presente (error si null)
const nullable = Optional.ofNullable(value);  // Acepta null/undefined
const empty = Optional.empty<T>();            // Sin valor
```

## Métodos Principales

```typescript
const optional: Optional<User> = Optional.ofNullable(user);

// Verificar presencia
if (optional.isPresent()) {
  const user = optional.get();  // Seguro después de isPresent()
}

if (optional.isEmpty()) {
  // Manejar ausencia
}

// Valor por defecto
const value = optional.orElse(defaultUser);
const computed = optional.orElseGet(() => createDefaultUser());
```

## Transformaciones

```typescript
// map - transforma si presente
const name = optional.map(user => user.name);  // Optional<string>

// flatMap - para Optional anidados
const role = optional.flatMap(user => findRole(user.roleId));

// filter - filtra según predicado
const active = optional.filter(user => user.isActive);
```

## Uso en Queries

```typescript
async findByEmail(email: string): Promise<Optional<User>> {
  const entity = await this.model.findOne({ email });

  if (!entity) {
    return Optional.empty();
  }

  return Optional.of(this.mapper.toDomain(entity));
}

// En el handler
const userOpt = await this.repository.findByEmail(email);

return userOpt
  .map(user => UserDto.fromDomain(user))
  .orElse(null);
```

## Anti-patrones

- Usar `get()` sin verificar `isPresent()` primero
- Usar `Optional.of()` con valores potencialmente null
- Anidar Optional innecesariamente
