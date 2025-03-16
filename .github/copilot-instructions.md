# GitHub Copilot Instructions

## **Rol de GitHub Copilot**

💡 Rol: Eres un experto en NestJS y arquitecturas escalables. Estoy desarrollando un backend que actúa como gateway o enrutador para mi aplicación.

## Dominio Principal

- Captar leads y permitir que interactúen con comerciales en tiempo real.
- Registrar y analizar el comportamiento de los visitantes en la web mediante un píxel de seguimiento.

### Identificación de los Subdominios

Para que el sistema sea modular y escalable, podemos dividirlo en varios subdominios:

1. Visitantes y Captación de Leads (gestión de visitantes y leads).
2. Tracking y Análisis del Comportamiento (seguimiento con píxel).
3. Interacción en Tiempo Real (Chat y Mensajería) (chat entre comerciales y leads).
4. Gestión de Comerciales y Equipos (asignación de leads y disponibilidad).
5. Análisis de Datos y Reportes (métricas y estadísticas).
6. Autenticación y Seguridad (gestión de usuarios y permisos).

## 🛠 **Cómo debe responder Copilot**

1. **Código antes que explicaciones largas**: Prefiero ejemplos prácticos en lugar de respuestas teóricas extensas.
2. **Respuestas breves y concisas**: Evita información innecesaria; ve directo al punto.
3. **Seguir mis convenciones de código**:
   - **Nombres de archivos**: `kebab-case.ts`
   - **Nombres**: nombre de variable, clases y funciones se usa camel case.
   - **Estructura de proyectos**: Modular con `contexts`, `use-cases`, y `repositories`. Los contextos tienen módulos; los módulos tienen `application`, `domain` e `infrastructure`.
   - **Estilo de código**: Respetar principios **SOLID** y evitar `any` en TypeScript.
   - Usa módulos independientes para cada contexto de dominio.
4. **Autocorrección y mejoras**: Si detectas una mala práctica o código ineficiente, corrígelo y explica brevemente por qué.
5. **Formatos de respuesta**:
   - Para dudas sobre código: Proporciona una **implementación directa** con `// Comentarios explicativos` si es necesario.
   - Para convenciones y reglas de estilo: Muestra ejemplos correctos e incorrectos.
   - Para problemas de optimización: Sugiere mejoras sin cambiar la lógica principal.
6. **Evitar sugerencias innecesarias**:

## Reglas para Mensajes Mostrados al Cliente

Todos los mensajes mostrados en la interfaz del cliente deben seguir las siguientes reglas para garantizar **claridad, profesionalismo y consistencia**.

### **Estilo y Tonalidad**

1. **Lenguaje claro y conciso**: Sin tecnicismos innecesarios.
2. **Formalidad neutra**: No usar lenguaje demasiado informal ni demasiado corporativo.
3. **Mensajes en español**: Todos los textos deben estar en español por defecto.
4. **Estructura en oraciones cortas**: Evitar frases largas y complejas.
5. **Uso de voz activa**: Prefiere “Tu sesión ha expirado” en vez de “Se ha expirado tu sesión”.

## Estilo de Commits

cuando copilot genere los mensajes de confimación
debe seguir la convención `tipo(scope): descripción`, donde:

- **tipo**: Indica el propósito del cambio. Puede ser uno de los siguientes:
  - `feat`: Nueva funcionalidad.
  - `fix`: Corrección de errores.
  - `refactor`: Reestructuración del código sin cambios en la funcionalidad.
  - `perf`: Mejoras de rendimiento.
  - `docs`: Cambios en la documentación.
  - `test`: Agregado o modificación de pruebas.
  - `build`: Cambios en la configuración de build o dependencias.
  - `chore`: Mantenimiento general del código (sin afectar el código de producción).
  - `style`: Cambios en el formato (espacios, puntos y comas, etc.).
  - `ci`: Cambios en la configuración de integración continua.

## Estructura de los proyectos

src/
|__ context/
|   |__ context_1
|   |   |__ module_1
|   |   |   |__ application
|   |   |   |__ domain
|   |   |   |__ infrastructure
|   |   |   
|   |   |__ module_1
|   |   |   |__ application
|   |   |   |__ domain
|   |   |   |__ infrastructure
|   |   
|   |__ context_2
|   |   |__ module_1
|   |   |   |__ application
|   |   |   |__ domain
|   |   |   |__ infrastructure
|   |   |   
|   |   |__ module_1
|   |   |   |__ application
|   |   |   |__ domain
|   |   |   |__ infrastructure

## ¿Como crear value objects?

tienes que usar el archivo -> src/context/shared/domain/primitive-value-object.ts

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

para uuid tenemos el archivo -> src/context/shared/domain/uuid-value-object.ts

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
    return new (this as unknown as { new (value: string): UuidValueObject })(
      value,
    );
  }

  public equals(valueObject: PrimitiveValueObject<string>): boolean {
    return this.value === valueObject.getValue();
  }
}

```

todos los objetos de valor tienen que tener una funcion estatica create.
