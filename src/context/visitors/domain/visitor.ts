import { AggregateRoot } from '@nestjs/cqrs';
import { VisitorId } from './value-objects/visitor-id';
import { VisitorName } from './value-objects/visitor-name';
import { VisitorEmail } from './value-objects/visitor-email';
import { VisitorTel } from './value-objects/visitor-tel';
import { VisitorTags } from './value-objects/visitor-tags';
import { VisitorNotes } from './value-objects/visitor-notes';
import { VisitorCreatedEvent } from './events/visitor-created-event';
import { VisitorAliasAssignedEvent } from './events/visitor-alias-assigned-event';
import { Optional } from 'src/context/shared/domain/optional';
import { VisitorCurrentPage } from './value-objects/visitor-current-page';
import { VisitorConnectionTime } from './value-objects/visitor-connection-time';
import { VisitorCurrentPageUpdatedEvent } from './events/visitor-current-page-updated-event';
import { VisitorConnectionTimeUpdatedEvent } from './events/visitor-connection-time-updated-event';
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
  notes: string[]; // Ahora es un array de strings
  currentPage: string | null; // Nueva propiedad para la página actual
  connectionTime: number | null; // Tiempo de conexión en milisegundos
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
    private readonly _currentPage: VisitorCurrentPage | null = null, // Nueva propiedad para la página actual
    private readonly _connectionTime: VisitorConnectionTime | null = null, // Tiempo de conexión
  ) {
    super();
    this._currentPage = _currentPage;
    this._connectionTime = _connectionTime;
  }

  // Método de fábrica para crear un visitante desde value objects
  public static create(params: {
    id: VisitorId;
    name?: VisitorName;
    email?: VisitorEmail;
    tel?: VisitorTel;
    tags?: VisitorTags;
    notes?: VisitorNotes;
    currentPage?: VisitorCurrentPage | null;
    connectionTime?: VisitorConnectionTime | null;
  }): Visitor {
    const visitor = new Visitor(
      params.id,
      params.name ?? null,
      params.email ?? null,
      params.tel ?? null,
      params.tags ?? VisitorTags.fromPrimitives([]),
      params.notes ?? VisitorNotes.fromPrimitives([]),
      params.currentPage ?? null,
      params.connectionTime ?? null,
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
    notes?: string[]; // Ahora es un array de strings
    currentPage?: string | null;
    connectionTime?: number | null;
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
      params.currentPage ? new VisitorCurrentPage(params.currentPage) : null,
      params.connectionTime
        ? new VisitorConnectionTime(params.connectionTime)
        : null,
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
      currentPage: this._currentPage ? this._currentPage.value : null,
      connectionTime: this._connectionTime ? this._connectionTime.value : null,
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
  get currentPage(): Optional<VisitorCurrentPage> {
    // Devuelve un Optional con la página actual si existe
    if (this._currentPage) {
      return Optional.of(this._currentPage);
    }
    return Optional.empty();
  }
  get connectionTime(): Optional<VisitorConnectionTime> {
    // Devuelve un Optional con el tiempo de conexión si existe
    if (this._connectionTime) {
      return Optional.of(this._connectionTime);
    }
    return Optional.empty();
  }

  // Método para actualizar la página actual de forma inmutable
  // Devuelve una nueva instancia de Visitor con el estado actualizado y aplica un evento de dominio
  public updateCurrentPage(newPage: VisitorCurrentPage): Visitor {
    // Si la página es la misma, retorna la misma instancia (idempotencia)
    if (this._currentPage && this._currentPage.value === newPage.value) {
      return this;
    }
    const updated = new Visitor(
      this._id,
      this._name,
      this._email,
      this._tel,
      this._tags,
      this._notes,
      newPage,
      this._connectionTime,
    );
    updated.apply(
      new VisitorCurrentPageUpdatedEvent({
        visitorId: this._id.value,
        currentPage: newPage.value,
      }),
    );
    return updated;
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
      this._notes,
      this._currentPage,
      this._connectionTime,
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
      this._notes,
      this._currentPage,
      this._connectionTime,
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
      this._notes,
      this._currentPage,
      this._connectionTime,
    );
    updated.apply(
      new VisitorTelUpdatedEvent({
        visitorId: this._id.value,
        tel: newTel.value,
      }),
    );
    return updated;
  }

  // Método para actualizar el tiempo de conexión de forma inmutable
  public updateConnectionTime(
    newConnectionTime: VisitorConnectionTime,
  ): Visitor {
    // Si el tiempo de conexión es el mismo, retorna la misma instancia (idempotencia)
    if (
      this._connectionTime &&
      this._connectionTime.value === newConnectionTime.value
    ) {
      return this;
    }
    const updated = new Visitor(
      this._id,
      this._name,
      this._email,
      this._tel,
      this._tags,
      this._notes,
      this._currentPage,
      newConnectionTime,
    );

    // Preservar eventos uncommitted de la instancia original
    const uncommittedEvents = this.getUncommittedEvents();
    if (uncommittedEvents.length > 0) {
      updated.loadFromHistory(uncommittedEvents);
    }

    updated.apply(
      new VisitorConnectionTimeUpdatedEvent({
        visitorId: this._id.value,
        connectionTime: newConnectionTime.value,
      }),
    );
    return updated;
  }
}
