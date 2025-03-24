# GitHub Copilot Instructions

## 🌟 Rol de GitHub Copilot

**Rol:** Eres un experto en NestJS y arquitecturas escalables. Estoy desarrollando un backend que actúa como gateway para mi aplicación.

### 🧠 Dominio Principal

- Captar leads y permitir que interactúen con comerciales en tiempo real.
- Registrar y analizar el comportamiento de los visitantes mediante un píxel de seguimiento.

### 🧹 Subdominios del Sistema

1. Gestión de visitantes y leads.
2. Tracking y análisis (píxel).
3. Interacción en tiempo real (chat/mensajería).
4. Gestión de comerciales y equipos.
5. Reportes y análisis de datos.
6. Autenticación y seguridad.

---

## 🤖 ¿Cómo debe responder Copilot?

### ✅ Preferencias

1. **Código > Explicaciones**: Prefiero ejemplos prácticos. No des discursos.
2. **Respuestas breves y concisas**: Sin vueltas. Directo al punto.
3. **Convenciones de código**:
   - Archivos: `kebab-case.ts`
   - Nombres (variables, clases, funciones): `camelCase`
   - Estructura modular: `contexts`, `use-cases`, `repositories`
   - Cada contexto tiene: `application`, `domain`, `infrastructure`
   - Estilo: **SOLID**, nada de `any`
   - Usa módulos independientes por contexto
4. **Autocorrección**: Si ves malas prácticas, corrige y explica brevemente por qué.

### 📦 Formatos esperados

- **Código**: Implementación directa con comentarios si hace falta.
- **Convenciones y estilo**: Ejemplos buenos vs malos.
- **Optimización**: Sugiere mejoras sin romper la lógica.

### 🚫 Evita...

- Explicaciones innecesarias
- Comentarios obvios
- Verbosidad

---

## 💬 Reglas para Mensajes al Cliente

### ✍️ Estilo y Tonalidad

- Lenguaje claro y profesional.
- En español.
- Frases cortas y con voz activa.
- Ejemplo: ✅ "Tu sesión ha expirado" | ❌ "Se ha expirado tu sesión"

---

## 📌 Convención de Commits

Usa el formato: `tipo(scope): descripción`

### Tipos válidos:

- `feat`: Nueva funcionalidad.
- `fix`: Corrección de errores.
- `refactor`: Reestructuración sin romper lógica.
- `perf`: Mejora de rendimiento.
- `docs`: Cambios en la documentación.
- `test`: Nuevas pruebas o mantenimiento.
- `build`: Configuración de build o dependencias.
- `chore`: Mantenimiento general.
- `style`: Formato, espacios, puntos y comas.
- `ci`: Configuración de CI.

---

## 🧱 Estructura de Proyecto

```bash
src/
├── context/
│   ├── context_1/
│   │   ├── module_1/
│   │   │   ├── application/
│   │   │   ├── domain/
│   │   │   └── infrastructure/
│   │   └── module_2/
│   │       ├── application/
│   │       ├── domain/
│   │       └── infrastructure/
│   └── shared/
│       ├── domain/
│       └── infrastructure/
```

---

## 🧹 Cómo Crear Value Objects

### Archivo base

`src/context/shared/domain/primitive-value-object.ts`

```ts
import { ValidationError } from './validation.error';

export abstract class PrimitiveValueObject<T> {
  readonly value: T;

  protected constructor(
    value: T,
    validate?: (value: T) => boolean,
    errorMessage?: string,
  ) {
    this.value = value;
    if (validate && !validate(this.value) && errorMessage) {
      throw new ValidationError(errorMessage);
    }
  }

  public getValue(): T {
    return this.value;
  }

  public equals(valueObject: PrimitiveValueObject<T>): boolean {
    return this.value === valueObject.getValue();
  }
}
```

> ✅ Usa `.value` para acceder al valor.  
> ❌ Evita `.getValue()`

---

### UUID Value Object

`src/context/shared/domain/uuid-value-object.ts`

```ts
import { PrimitiveValueObject } from './primitive-value-object';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export abstract class UuidValueObject extends PrimitiveValueObject<string> {
  protected constructor(value: string) {
    super(value, uuidValidate, 'Invalid UUID format');
  }

  public static generate(): string {
    return uuidv4();
  }

  public static random<T extends UuidValueObject>(): T {
    return new (this as unknown as { new (value: string): T })(this.generate());
  }

  public static create(value: string): UuidValueObject {
    return new (this as unknown as { new (value: string): UuidValueObject })(value);
  }

  public equals(valueObject: PrimitiveValueObject<string>): boolean {
    return this.value === valueObject.getValue();
  }
}
```

---

### Ejemplo de Value Object Personalizado

```ts
import { PrimitiveValueObject } from '../../../shared/domain/primitive-value-object';

export class Content extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(
      value,
      (v) => v.trim().length > 0,
      'El contenido no puede estar vacío',
    );
  }

  public static create(value: string): Content {
    return new Content(value);
  }
}
```

---

## 🧐 CQRS

### 🔹 Comandos

```ts
import { ICommand } from '@nestjs/cqrs';

export class NewChatCommand implements ICommand {
  constructor(public readonly visitorId: string) {}
}
```
