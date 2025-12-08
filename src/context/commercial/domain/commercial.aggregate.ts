import { AggregateRoot } from '@nestjs/cqrs';
import { CommercialId } from './value-objects/commercial-id';
import { CommercialName } from './value-objects/commercial-name';
import { CommercialConnectionStatus } from './value-objects/commercial-connection-status';
import { CommercialLastActivity } from './value-objects/commercial-last-activity';
import { CommercialConnectedEvent } from './events/commercial-connected.event';
import { CommercialConnectionStatusChangedEvent } from './events/commercial-connection-status-changed.event';
import { CommercialHeartbeatReceivedEvent } from './events/commercial-heartbeat-received.event';
import { CommercialFingerprintRegisteredEvent } from './events/commercial-fingerprint-registered.event';

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
  knownFingerprints?: string[]; // Fingerprints de navegadores conocidos del comercial
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
  knownFingerprints?: string[];
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
    private _knownFingerprints: Set<string> = new Set(),
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
      new Set(props.knownFingerprints ?? []),
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
      new Set(primitives.knownFingerprints ?? []),
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
      this._knownFingerprints,
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
      this._knownFingerprints,
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
      knownFingerprints: Array.from(this._knownFingerprints),
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
      this._knownFingerprints,
    );
  }

  /**
   * Actualiza el nombre del comercial
   */
  public updateName(name: string): Commercial {
    return new Commercial(
      this._id,
      new CommercialName(name),
      this._connectionStatus,
      this._lastActivity,
      this._createdAt,
      new Date(), // Update updatedAt
      this._avatarUrl,
      this._metadata,
      this._knownFingerprints,
    );
  }

  /**
   * Registra un fingerprint como conocido para este comercial
   */
  public registerFingerprint(fingerprint: string): Commercial {
    const newFingerprints = new Set(this._knownFingerprints);
    newFingerprints.add(fingerprint);

    const updated = new Commercial(
      this._id,
      this._name,
      this._connectionStatus,
      this._lastActivity,
      this._createdAt,
      new Date(), // Update updatedAt
      this._avatarUrl,
      this._metadata,
      newFingerprints,
    );

    // Emitir evento para que otros contextos reaccionen
    updated.apply(
      new CommercialFingerprintRegisteredEvent(this._id.value, fingerprint),
    );

    return updated;
  }

  /**
   * Elimina un fingerprint de los conocidos para este comercial
   */
  public removeFingerprint(fingerprint: string): Commercial {
    const newFingerprints = new Set(this._knownFingerprints);
    newFingerprints.delete(fingerprint);

    return new Commercial(
      this._id,
      this._name,
      this._connectionStatus,
      this._lastActivity,
      this._createdAt,
      new Date(), // Update updatedAt
      this._avatarUrl,
      this._metadata,
      newFingerprints,
    );
  }

  /**
   * Verifica si un fingerprint pertenece a este comercial
   */
  public hasFingerprint(fingerprint: string): boolean {
    return this._knownFingerprints.has(fingerprint);
  }

  /**
   * Obtiene la lista de fingerprints conocidos
   */
  public getKnownFingerprints(): string[] {
    return Array.from(this._knownFingerprints);
  }
}
