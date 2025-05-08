import { AggregateRoot } from '@nestjs/cqrs';
import { VisitorId } from './value-objects/visitor-id';
import { VisitorName } from './value-objects/visitor-name';
import { VisitorEmail } from './value-objects/visitor-email';
import { VisitorTel } from './value-objects/visitor-tel';
import { VisitorTags } from './value-objects/visitor-tags';
import { VisitorNotes } from './value-objects/visitor-notes';
import { VisitorCreatedEvent } from './events/visitor-created-event';

// Interfaz para serializar la entidad a primitivos
export interface VisitorPrimitives {
  id: string;
  name: string;
  email: string;
  tel: string;
  tags: string[];
  notes: string[]; // Ahora es un array de strings
}

// Entidad Visitor como AggregateRoot siguiendo DDD
export class Visitor extends AggregateRoot {
  // Propiedades encapsuladas
  private constructor(
    private readonly _id: VisitorId,
    private readonly _name: VisitorName,
    private readonly _email: VisitorEmail,
    private readonly _tel: VisitorTel,
    private readonly _tags: VisitorTags,
    private readonly _notes: VisitorNotes, // Ahora VisitorNotes es un array de VisitorNote
  ) {
    super();
  }

  // Método de fábrica para crear un visitante desde value objects
  public static create(params: {
    id: VisitorId;
    name: VisitorName;
    email: VisitorEmail;
    tel: VisitorTel;
    tags: VisitorTags;
    notes: VisitorNotes;
  }): Visitor {
    const visitor = new Visitor(
      params.id,
      params.name,
      params.email,
      params.tel,
      params.tags,
      params.notes,
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
  public static fromPrimitives(params: VisitorPrimitives): Visitor {
    return new Visitor(
      VisitorId.create(params.id),
      VisitorName.create(params.name),
      VisitorEmail.create(params.email),
      VisitorTel.create(params.tel),
      VisitorTags.fromPrimitives(params.tags),
      VisitorNotes.fromPrimitives(params.notes), // Reconstruye desde string[]
    );
  }

  // Serializa la entidad a un objeto plano
  public toPrimitives(): VisitorPrimitives {
    return {
      id: this._id.value,
      name: this._name.value,
      email: this._email.value,
      tel: this._tel.value,
      tags: this._tags.toPrimitives(), // Serializa como string[]
      notes: this._notes.toPrimitives(), // Serializa como string[]
    };
  }

  // Getters de solo lectura
  get id(): VisitorId {
    return this._id;
  }
  get name(): VisitorName {
    return this._name;
  }
  get email(): VisitorEmail {
    return this._email;
  }
  get tel(): VisitorTel {
    return this._tel;
  }
  get tags(): VisitorTags {
    return this._tags;
  }
  get notes(): VisitorNotes {
    return this._notes;
  }
}
