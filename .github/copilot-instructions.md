### Reglas para la creación de objetos de valor

1. **Clase Base**: Los objetos de valor deben extender la clase `PrimitiveValueObject` ubicada en `src/context/shared/domain/primitive-value-object.ts`.

2. **Validaciones**:
   - Las validaciones deben ser funciones de flecha definidas fuera de la clase, pero dentro del mismo archivo.
   - Estas funciones deben ser reutilizables y descriptivas.

3. **Constructor**:
   - El constructor debe recibir el valor y pasar la función de validación al constructor de la clase base.
   - Debe incluir un mensaje de error claro y específico en caso de que la validación falle.

4. **Ubicación**:
   - Los archivos de los objetos de valor deben estar en la carpeta `value-objects` correspondiente al contexto del dominio.

5. **Nombres**:
   - Los nombres de las clases deben ser descriptivos y seguir el formato `TrackingVisitor<PropertyName>`.

6. **Ejemplo**:
```typescript
const validateExample = (value: string): boolean => value.length > 0;

import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ExampleValueObject extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value, validateExample, 'ExampleValueObject cannot be empty');
  }
}
```