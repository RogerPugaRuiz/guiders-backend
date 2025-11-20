import { AggregateRoot } from '@nestjs/cqrs';
import { CommercialId } from './value-objects/commercial-id';
import { CommercialName } from './value-objects/commercial-name';
import { CommercialConnectionStatus } from './value-objects/commercial-connection-status';
import { CommercialLastActivity } from './value-objects/commercial-last-activity';
import { CommercialConnectedEvent } from './events/commercial-connected.event';
import { CommercialConnectionStatusChangedEvent } from './events/commercial-connection-status-changed.event';
import { CommercialHeartbeatReceivedEvent } from './events/commercial-heartbeat-received.event';

/**
 * Primitivos para la serialización del agregado Commercial
 */
export interface CommercialPrimitives {
  id: string;
  name: string;
  connectionStatus: string;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
  avatarUrl?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Propiedades para crear un Commercial
 */
export interface CommercialProperties {
  id: CommercialId;
  name: CommercialName;
  connectionStatus?: CommercialConnectionStatus;
  lastActivity?: CommercialLastActivity;
  createdAt?: Date;
  updatedAt?: Date;
  avatarUrl?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Agregado Commercial siguiendo DDD
 * Representa un comercial en el sistema con capacidades de heartbeat
 */
export class Commercial extends AggregateRoot {
  // Constructor privado para forzar el uso de los métodos de fábrica
  private constructor(
    private readonly _id: CommercialId,
    private readonly _name: CommercialName,
    private _connectionStatus: CommercialConnectionStatus,
    private _lastActivity: CommercialLastActivity,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _avatarUrl?: string | null,
    private _metadata?: Record<string, any>,
  ) {
    super();
  }

  /**
   * Método de fábrica para crear un comercial y emitir evento
   */
  public static create(props: CommercialProperties): Commercial {
    const now = new Date();
    const commercial = new Commercial(
      props.id,
      props.name,
      props.connectionStatus ?? CommercialConnectionStatus.offline(),
      props.lastActivity ?? CommercialLastActivity.now(),
      props.createdAt ?? now,
      props.updatedAt ?? now,
      props.avatarUrl ?? null,
      props.metadata,
    );

    commercial.apply(
      new CommercialConnectedEvent({
        commercialId: commercial._id.value,
        name: commercial._name.value,
        connectionStatus: commercial._connectionStatus.value,
        connectedAt: commercial._createdAt,
      }),
    );

    return commercial;
  }

  /**
   * Método de fábrica para reconstruir desde primitivos (sin eventos)
   */
  public static fromPrimitives(primitives: CommercialPrimitives): Commercial {
    return new Commercial(
      new CommercialId(primitives.id),
      new CommercialName(primitives.name),
      new CommercialConnectionStatus(primitives.connectionStatus),
      new CommercialLastActivity(primitives.lastActivity),
      primitives.createdAt,
      primitives.updatedAt,
      primitives.avatarUrl ?? null,
      primitives.metadata,
    );
  }

  /**
   * Actualiza el heartbeat del comercial
   */
  public updateHeartbeat(): Commercial {
    const newLastActivity = CommercialLastActivity.now();
    const updated = new Commercial(
      this._id,
      this._name,
      this._connectionStatus,
      newLastActivity,
      this._createdAt,
      new Date(),
      this._avatarUrl,
      this._metadata,
    );

    updated.apply(
      new CommercialHeartbeatReceivedEvent({
        commercialId: this._id.value,
        lastActivity: newLastActivity.value,
        connectionStatus: this._connectionStatus.value,
      }),
    );

    return updated;
  }

  /**
   * Cambia el estado de conexión del comercial
   */
  public changeConnectionStatus(
    newStatus: CommercialConnectionStatus,
  ): Commercial {
    // Si el estado es el mismo, retorna la misma instancia
    if (this._connectionStatus.value === newStatus.value) {
      return this;
    }

    const updated = new Commercial(
      this._id,
      this._name,
      newStatus,
      CommercialLastActivity.now(),
      this._createdAt,
      new Date(),
      this._avatarUrl,
      this._metadata,
    );

    updated.apply(
      new CommercialConnectionStatusChangedEvent({
        commercialId: this._id.value,
        previousStatus: this._connectionStatus.value,
        newStatus: newStatus.value,
        changedAt: new Date(),
      }),
    );

    return updated;
  }

  /**
   * Determina si el comercial está activo (no expirado)
   */
  public isActive(timeoutMinutes: number = 5): boolean {
    return !this._lastActivity.isExpired(timeoutMinutes);
  }

  /**
   * Serializa el agregado a primitivos
   */
  public toPrimitives(): CommercialPrimitives {
    return {
      id: this._id.value,
      name: this._name.value,
      connectionStatus: this._connectionStatus.value,
      lastActivity: this._lastActivity.value,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      avatarUrl: this._avatarUrl ?? null,
      metadata: this._metadata,
    };
  }

  // Getters de solo lectura
  get id(): CommercialId {
    return this._id;
  }

  get name(): CommercialName {
    return this._name;
  }

  get connectionStatus(): CommercialConnectionStatus {
    return this._connectionStatus;
  }

  get lastActivity(): CommercialLastActivity {
    return this._lastActivity;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get metadata(): Record<string, any> | undefined {
    return this._metadata;
  }

  get avatarUrl(): string | null | undefined {
    return this._avatarUrl;
  }

  /**
   * Actualiza el avatar del comercial
   */
  public updateAvatar(avatarUrl: string | null): Commercial {
    return new Commercial(
      this._id,
      this._name,
      this._connectionStatus,
      this._lastActivity,
      this._createdAt,
      new Date(), // Update updatedAt
      avatarUrl,
      this._metadata,
    );
  }
}
