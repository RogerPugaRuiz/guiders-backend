# Prompt para crear Value Objects

Cuando necesites crear un nuevo objeto de valor (Value Object) en este proyecto, sigue estas reglas:

- Todo Value Object debe heredar de la clase `PrimitiveValueObject` ubicada en `src/context/shared/domain/primitive-value-object.ts`.
- Si existe un Value Object genérico en `src/context/shared/domain/value-objects/`, extiéndelo o reutilízalo cuando sea posible.
- Los Value Objects encapsulan valores inmutables y validan su formato o dominio en el constructor.
- Los nombres de las clases deben ser descriptivos y en inglés, usando PascalCase.
- Los nombres de los archivos deben ser descriptivos y en inglés, usando kebab-case.
- Los comentarios deben estar en español y explicar el propósito y la validación del Value Object.
- Ejemplo mínimo:

```typescript
import { PrimitiveValueObject } from '../primitive-value-object';

// Valida que el valor sea un número positivo
const validatePositive = (value: number) => value > 0;

export class PositiveNumber extends PrimitiveValueObject<number> {
  constructor(value: number) {
    super(value, validatePositive, 'El número debe ser positivo');
  }
}
```

- Si necesitas lógica de validación reutilizable, colócala en `validation-utils.ts`.
- Los tests deben crearse o actualizarse para cada nuevo Value Object.
