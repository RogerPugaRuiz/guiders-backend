---
applyTo: '**/domain/**/*.ts'
---
# ROL/SISTEMA
Eres un experto en TypeScript y DDD.

# PREPARACIÓN
Antes de comenzar, asegúrate de que el contexto esté claro y que tengas toda la información necesaria para crear el dominio.

# TAREAS
Tu tarea es crear el dominio de un contexto específico de la aplicación.

# PASOS
1. Genera los objetos de valor necesarios para la entidad.
2. Genera los eventos de dominio necesarios para el contexto.
3. Genera las entidades de dominio necesaras para el contexto
4. Genera la interfaz del repositorio y el símbolo para la inyección de dependencias. 

# FORMATO
- Los objetos de valor deben estar en la carpeta `value-objects` dentro del src/context/{context}/domain
- para crear un value object extiende de `PrimitiveValueObject` o de los objetos de valor genericos que estan el la carpeta `value-objects` dentro del src/context/shared/domain
- Los eventos de dominio deben estar en la carpeta `events` dentro del src/context/{context}/domain
- Las entidades deben estar en la carpeta `entities` dentro del src/context/{context}/domain a no ser que la entidad sea un aggregate root, en cuyo caso debe estar en la raiz de la carpeta `domain`
- La interfaz del repositorio debe estar en la carpeta raiz de la carpeta `domain` junto a la entidad principal.
- La interfaz del repositorio debe contemplar los siguientes métodos: save, findById, findAll, delete, update, findOne y match. En aquellos metodos que pueda devolver null o undefined, el tipo de retorno debe ser una promesa de Result<T, DomainError> de `Result` y el error debe ser de tipo `DomainError`.
- El símbolo para la inyección de dependencias debe estar en el mismo archivo que la interfaz del repositorio.
- Las entidades deben tener los métodos de fábrica `create` y `fromPrimitives` y el método `toPrimitives`.
- Los metodos de fabrica deben ser estáticos y recibir un objeto con las propiedades necesarias para crear la entidad.
- Las entidades deben extender de `AggregateRoot` de `@nestjs/cqrs`.
- Los eventos de dominio deben extender de `DomainEvent` y tener el payload necesario.
- Todas las propiedades de las entidades tiene que ser private readonly.

# EJEMPLOS
- Ejemplo de una agregate root:
```typescript
import { AggregateRoot } from '@nestjs/cqrs';
import { VisitorId } from './value-objects/visitor-id';
import { VisitorName } from './value-objects/visitor-name';
import { VisitorEmail } from './value-objects/visitor-email';
import { VisitorTel } from './value-objects/visitor-tel';
import { VisitorTags } from './value-objects/visitor-tags';
import { VisitorNotes } from './value-objects/visitor-notes';
import { VisitorCreatedEvent } from './events/visitor-created-event';
import { Optional } from 'src/context/shared/domain/optional';

// Interfaz para serializar la entidad a primitivos
export interface VisitorPrimitives {
  id: string;
  name: string | null;
  email: string | null;
  tel: string | null;
  tags: string[];
  notes: string[]; // Ahora es un array de strings
}

export interface VisitorProperties {
  id: VisitorId;
  name: VisitorName | null;
  email: VisitorEmail | null;
  tel: VisitorTel | null;
  tags: VisitorTags;
  notes: VisitorNotes; // Ahora VisitorNotes es un array de VisitorNote
}

// Entidad Visitor como AggregateRoot siguiendo DDD
export class Visitor extends AggregateRoot {
  // Propiedades encapsuladas
  private constructor(
    private readonly _id: VisitorId,
    private readonly _name: VisitorName | null,
    private readonly _email: VisitorEmail | null,
    private readonly _tel: VisitorTel | null,
    private readonly _tags: VisitorTags,
    private readonly _notes: VisitorNotes, // Ahora VisitorNotes es un array de VisitorNote
  ) {
    super();
  }

  // Método de fábrica para crear un visitante desde value objects
  public static create(props: VisitorProperties): Visitor {
    const visitor = new Visitor(
      props.id,
      props.name,
      props.email,
      props.tel,
      props.tags,
      props.notes,
    );
    // Aplica el evento de dominio al crear el visitante
    visitor.apply(
      new VisitorCreatedEvent({
        visitor: visitor.toPrimitives(),
      }),
    );
    return visitor;
  }

  // Método de fábrica para reconstruir desde datos primitivos
  public static fromPrimitives(params: {
    id: string;
    name?: string | null;
    email?: string | null;
    tel?: string | null;
    tags?: string[];
    notes?: string[]; // Ahora es un array de strings
  }): Visitor {
    return new Visitor(
      VisitorId.create(params.id),
      params.name ? VisitorName.create(params.name) : null,
      params.email ? VisitorEmail.create(params.email) : null,
      params.tel ? VisitorTel.create(params.tel) : null,
      params.tags
        ? VisitorTags.fromPrimitives(params.tags)
        : VisitorTags.fromPrimitives([]),
      params.notes
        ? VisitorNotes.fromPrimitives(params.notes)
        : VisitorNotes.fromPrimitives([]), // Reconstruye desde string[]
    );
  }

  // Serializa la entidad a un objeto plano
  public toPrimitives(): VisitorPrimitives {
    return {
      id: this._id.value,
      name: this._name ? this._name.value : null,
      email: this._email ? this._email.value : null,
      tel: this._tel ? this._tel.value : null,
      tags: this._tags.toPrimitives(), // Serializa como string[]
      notes: this._notes.toPrimitives(), // Serializa como string[]
    };
  }

  // Getters de solo lectura
  get id(): VisitorId {
    return this._id;
  }
  get name(): Optional<VisitorName> {
    return this._name ? Optional.of(this._name) : Optional.empty();
  }
  get email(): Optional<VisitorEmail> {
    return this._email ? Optional.of(this._email) : Optional.empty();
  }
  get tel(): Optional<VisitorTel> {
    return this._tel ? Optional.of(this._tel) : Optional.empty();
  }
  get tags(): VisitorTags {
    return this._tags;
  }
  get notes(): VisitorNotes {
    return this._notes;
  }
}
```
- Ejemplo de un value object:
```typescript
import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para el tipo de evento de tracking
// Valida que el tipo de evento sea un string no vacío
const validateEventType = (value: string) =>
  typeof value === 'string' && value.trim().length > 0;

export class EventType extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value, validateEventType, 'El tipo de evento no puede estar vacío');
  }
}
```
- Ejemplo de un evento de dominio:
```typescript
  import { DomainEvent } from 'src/context/shared/domain/domain-event';
  import { UserAccountPrimitives } from '../user-account';

  export class UserAccountCreatedEvent extends DomainEvent<{
    user: UserAccountPrimitives;
  }> {}
```

# ACLARACIONES
- No crees un metodoo create en los value objects, ya que no es necesario porque ya extienden de PrimitiveValueObject y este ya tiene un metodo create.
