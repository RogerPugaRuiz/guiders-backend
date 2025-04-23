# Cómo usar la API Optional

La clase `Optional<T>` permite manejar valores que pueden estar presentes o ausentes, evitando el uso de `null` o `undefined` directamente y facilitando un código más seguro y expresivo.

## Creación

- Para crear un Optional con valor:
  ```typescript
  const optional = Optional.of(valor);
  ```
- Para crear un Optional que puede ser nulo o undefined:
  ```typescript
  const optional = Optional.ofNullable(valorPosiblementeNulo);
  ```
- Para un Optional vacío:
  ```typescript
  const emptyOptional = Optional.empty();
  ```

## Métodos principales

- `isPresent()`: Devuelve `true` si hay valor.
- `isEmpty()`: Devuelve `true` si está vacío.
- `get()`: Devuelve el valor o lanza error si está vacío.
- `getOrNull()`: Devuelve el valor o `null` si está vacío.
- `map(fn)`: Transforma el valor si está presente.
- `flatMap(fn)`: Transforma y aplana el resultado si está presente.
- `filter(predicate)`: Devuelve vacío si el valor no cumple la condición.
- `orElse(defaultValue)`: Devuelve el valor o el valor por defecto si está vacío.
- `orElseGet(supplier)`: Devuelve el valor o el resultado de la función si está vacío.
- `orElseThrow(error)`: Devuelve el valor o lanza el error si está vacío.
- `fold(ifEmpty, mapper)`: Ejecuta una función según si hay valor o no.

## Ejemplo de uso

```typescript
const optional = Optional.ofNullable(usuario);

if (optional.isPresent()) {
  // Hay valor: accede con optional.get()
} else {
  // Está vacío
}
```

Utiliza siempre `Optional` para evitar errores por valores nulos y hacer el código más robusto y legible.
