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

6. **Creación de Clases**:
   - Siempre que se solicite crear una clase, debe ser lo principal crear un archivo nuevo para dicha clase.

7. **Ejemplo**:
```typescript
const validateExample = (value: string): boolean => value.length > 0;

import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ExampleValueObject extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value, validateExample, 'ExampleValueObject cannot be empty');
  }
}
```

8. **Reutilización de ValueObjects Existentes**:
   - Antes de crear un nuevo objeto de valor, verifica en la carpeta `value-objects` dentro de `src/context/shared/domain/` si existe un objeto de valor que pueda ser reutilizado o extendido para cumplir con los requisitos del contexto de la entidad.

### Reglas para la exposición de contexto en objetos de valor

1. **Contexto Específico**: Los objetos de valor deben exponer el contexto de la entidad a la que pertenecen, en lugar de ser genéricos.

2. **Nombres Descriptivos**: Los nombres de los objetos de valor deben reflejar claramente su propósito y relación con la entidad. Por ejemplo, `TrackingVisitor<PropertyName>`.

3. **Consistencia del Dominio**: Los objetos de valor deben alinearse con las reglas y el contexto del dominio para garantizar claridad y mantenibilidad.

4. **Validaciones Contextuales**: Las validaciones deben ser específicas al contexto del objeto de valor y reflejar las reglas del negocio asociadas.