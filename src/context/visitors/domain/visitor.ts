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
