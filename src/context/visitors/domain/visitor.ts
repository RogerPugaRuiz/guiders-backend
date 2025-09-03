import { AggregateRoot } from '@nestjs/cqrs';
import { VisitorId } from './value-objects/visitor-id';
import { VisitorName } from './value-objects/visitor-name';
import { VisitorEmail } from './value-objects/visitor-email';
import { VisitorTel } from './value-objects/visitor-tel';
import { VisitorTags } from './value-objects/visitor-tags';
import { VisitorCreatedEvent } from './events/visitor-created-event';
import { VisitorAliasAssignedEvent } from './events/visitor-alias-assigned-event';
import { Optional } from 'src/context/shared/domain/optional';
import { VisitorEmailUpdatedEvent } from './events/visitor-email-updated-event';
import { VisitorNameUpdatedEvent } from './events/visitor-name-updated-event';
import { VisitorTelUpdatedEvent } from './events/visitor-tel-updated-event';

// Interfaz para serializar la entidad a primitivos
export interface VisitorPrimitives {
  id: string;
  name: string | null;
  email: string | null;
  tel: string | null;
  tags: string[];
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
  ) {
    super();
  }

  // Método de fábrica para crear un visitante desde value objects
  public static create(params: {
    id: VisitorId;
    name?: VisitorName;
    email?: VisitorEmail;
    tel?: VisitorTel;
    tags?: VisitorTags;
    // currentPage y connectionTime eliminados
  }): Visitor {
    const visitor = new Visitor(
      params.id,
      params.name ?? null,
      params.email ?? null,
      params.tel ?? null,
      params.tags ?? VisitorTags.fromPrimitives([]),
    );

    // Aplica el evento de dominio al crear el visitante
    visitor.apply(
      new VisitorCreatedEvent({
        visitor: visitor.toPrimitives(),
      }),
    );

    // Si el visitante se crea con un nombre (alias), emite el evento específico de asignación de alias
    if (params.name) {
      visitor.apply(
        new VisitorAliasAssignedEvent({
          visitorId: params.id.value,
          alias: params.name.value,
        }),
      );
    }

    return visitor;
  }

  // Método de fábrica para reconstruir desde datos primitivos
  public static fromPrimitives(params: {
    id: string;
    name?: string | null;
    email?: string | null;
    tel?: string | null;
    tags?: string[];
    // currentPage y connectionTime eliminados
  }): Visitor {
    return new Visitor(
      VisitorId.create(params.id),
      params.name ? VisitorName.create(params.name) : null,
      params.email ? VisitorEmail.create(params.email) : null,
      params.tel ? VisitorTel.create(params.tel) : null,
      params.tags
        ? VisitorTags.fromPrimitives(params.tags)
        : VisitorTags.fromPrimitives([]),
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

  // Método para actualizar el email de forma inmutable
  public updateEmail(newEmail: VisitorEmail): Visitor {
    // Si el email es el mismo, retorna la misma instancia (idempotencia)
    if (this._email && this._email.value === newEmail.value) {
      return this;
    }
    const updated = new Visitor(
      this._id,
      this._name,
      newEmail,
      this._tel,
      this._tags,
    );
    updated.apply(
      new VisitorEmailUpdatedEvent({
        visitorId: this._id.value,
        email: newEmail.value,
      }),
    );
    return updated;
  }

  // Método para actualizar el nombre de forma inmutable
  public updateName(newName: VisitorName): Visitor {
    // Si el nombre es el mismo, retorna la misma instancia (idempotencia)
    if (this._name && this._name.value === newName.value) {
      return this;
    }
    const updated = new Visitor(
      this._id,
      newName,
      this._email,
      this._tel,
      this._tags,
    );
    updated.apply(
      new VisitorNameUpdatedEvent({
        visitorId: this._id.value,
        name: newName.value,
      }),
    );
    return updated;
  }

  // Método para actualizar el teléfono de forma inmutable
  public updateTel(newTel: VisitorTel): Visitor {
    // Si el teléfono es el mismo, retorna la misma instancia (idempotencia)
    if (this._tel && this._tel.value === newTel.value) {
      return this;
    }
    const updated = new Visitor(
      this._id,
      this._name,
      this._email,
      newTel,
      this._tags,
    );
    updated.apply(
      new VisitorTelUpdatedEvent({
        visitorId: this._id.value,
        tel: newTel.value,
      }),
    );
    return updated;
  }

  // Métodos y getters para currentPage y connectionTime eliminados
}
