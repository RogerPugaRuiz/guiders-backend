# How to Use the Result API

La API `Result` implementa el patrón Result para manejar operaciones que pueden tener éxito (`Ok`) o fallar (`Err`). Utilízala para evitar excepciones y controlar explícitamente los errores de dominio.

## Creación

- Para un resultado exitoso:
  ```typescript
  import { ok } from 'src/context/shared/domain/result';
  const result = ok(value);
  ```
- Para un error de dominio:
  ```typescript
  import { err } from 'src/context/shared/domain/result';
  const result = err(domainError);
  ```

## Métodos principales

- `isOk()`: Devuelve `true` si es éxito.
- `isErr()`: Devuelve `true` si es error.
- `map(fn)`: Transforma el valor si es éxito.
- `mapError(fn)`: Transforma el error si es error.
- `unwrap()`: Devuelve el valor o lanza excepción si es error.
- `unwrapOr(defaultValue)`: Devuelve el valor o el valor por defecto si es error.
- `fold(onErr, onOk)`: Ejecuta una función según si es éxito o error.

## Ejemplo de uso

```typescript
const result = ok(42);

if (result.isOk()) {
  // Éxito: accede a result.value
} else {
  // Error: accede a result.error
}
```

Utiliza siempre esta API para manejar resultados y errores de dominio de forma explícita y segura.
