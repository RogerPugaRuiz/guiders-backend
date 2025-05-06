# Crear Value Objects

## Rol

Actúa como un desarrollador experto en diseño de Value Objects para aplicaciones TypeScript siguiendo principios de DDD (Domain-Driven Design).

## Tarea

Define y desarrolla un nuevo Value Object en este proyecto cumpliendo estrictamente las siguientes directrices y pasos.

## Contexto y Reglas

### 1️⃣ Herencia Obligatoria

* Extiende siempre la clase `PrimitiveValueObject` ubicada en `src/context/shared/domain/primitive-value-object.ts`.

### 2️⃣ Reutilización

* Antes de crear uno nuevo, revisa si puedes extender o reutilizar un Value Object existente en `src/context/shared/domain/value-objects/`.

### 3️⃣ Validación

* Encapsula valores inmutables y valida su formato o dominio en el constructor.
* Si necesitas lógica de validación común, ubícala en `validation-utils.ts`.

### 4️⃣ Convenciones de Nomenclatura

* **Clases:** en PascalCase y en inglés (ejemplo: `PositiveNumber`).
* **Archivos:** en kebab-case y en inglés (ejemplo: `positive-number.ts`).

### 5️⃣ Documentación

* Incluye comentarios en español que expliquen el propósito del Value Object y su lógica de validación.

### 6️⃣ Ejemplos a Seguir

#### Ejemplo con validación personalizada

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

#### Ejemplo extendiendo un Value Object existente (UUID)

```typescript
import { UUID } from 'src/context/shared/domain/value-objects/uuid';

// Identificador único del evento de tracking
export class TrackingEventId extends UUID {
  constructor(value: string) {
    super(value);
  }
}
```

### 7️⃣ Pruebas

* Implementa o actualiza las pruebas para cada nuevo Value Object creado.

---

## Nota

Sigue esta guía siempre que implementes nuevos Value Objects para mantener la coherencia, claridad y robustez en el dominio de la aplicación.
