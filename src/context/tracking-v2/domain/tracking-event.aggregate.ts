import { AggregateRoot } from '@nestjs/cqrs';
import {
  TrackingEventId,
  EventType,
  EventMetadata,
  EventOccurredAt,
  VisitorId,
  SessionId,
  TenantId,
  SiteId,
} from './value-objects';
import { TrackingEventCreatedEvent } from './events/tracking-event-created.event';

/**
 * Primitivos para la serialización del agregado TrackingEvent
 */
export interface TrackingEventPrimitives {
  id: string;
  visitorId: string;
  sessionId: string;
  tenantId: string;
  siteId: string;
  eventType: string;
  metadata: Record<string, any>;
  occurredAt: string; // ISO string
  count?: number; // Para agregación de eventos
}

/**
 * Agregado TrackingEvent siguiendo DDD
 * Representa un evento de tracking generado por un visitante
 */
export class TrackingEvent extends AggregateRoot {
  private readonly _id: TrackingEventId;
  private readonly _visitorId: VisitorId;
  private readonly _sessionId: SessionId;
  private readonly _tenantId: TenantId;
  private readonly _siteId: SiteId;
  private readonly _eventType: EventType;
  private readonly _metadata: EventMetadata;
  private readonly _occurredAt: EventOccurredAt;
  private _count: number;

  private constructor(props: {
    id: TrackingEventId;
    visitorId: VisitorId;
    sessionId: SessionId;
    tenantId: TenantId;
    siteId: SiteId;
    eventType: EventType;
    metadata: EventMetadata;
    occurredAt: EventOccurredAt;
    count?: number;
  }) {
    super();
    this._id = props.id;
    this._visitorId = props.visitorId;
    this._sessionId = props.sessionId;
    this._tenantId = props.tenantId;
    this._siteId = props.siteId;
    this._eventType = props.eventType;
    this._metadata = props.metadata;
    this._occurredAt = props.occurredAt;
    this._count = props.count || 1;
  }

  /**
   * Método de fábrica para crear un nuevo evento (emite evento)
   */
  public static create(props: {
    id: TrackingEventId;
    visitorId: VisitorId;
    sessionId: SessionId;
    tenantId: TenantId;
    siteId: SiteId;
    eventType: EventType;
    metadata: EventMetadata;
    occurredAt?: EventOccurredAt;
    count?: number;
  }): TrackingEvent {
    const occurredAt = props.occurredAt || EventOccurredAt.now();

    const event = new TrackingEvent({
      id: props.id,
      visitorId: props.visitorId,
      sessionId: props.sessionId,
      tenantId: props.tenantId,
      siteId: props.siteId,
      eventType: props.eventType,
      metadata: props.metadata,
      occurredAt,
      count: props.count || 1,
    });

    // Emitir evento de creación
    event.apply(
      new TrackingEventCreatedEvent({
        id: event._id.getValue(),
        visitorId: event._visitorId.getValue(),
        sessionId: event._sessionId.getValue(),
        tenantId: event._tenantId.getValue(),
        siteId: event._siteId.getValue(),
        eventType: event._eventType.getValue(),
        metadata: event._metadata.getValue(),
        occurredAt: event._occurredAt.toISOString(),
        count: event._count,
      }),
    );

    return event;
  }

  /**
   * Método de fábrica para reconstruir desde primitivos (sin eventos)
   */
  public static fromPrimitives(
    primitives: TrackingEventPrimitives,
  ): TrackingEvent {
    return new TrackingEvent({
      id: new TrackingEventId(primitives.id),
      visitorId: new VisitorId(primitives.visitorId),
      sessionId: new SessionId(primitives.sessionId),
      tenantId: new TenantId(primitives.tenantId),
      siteId: new SiteId(primitives.siteId),
      eventType: EventType.create(primitives.eventType),
      metadata: EventMetadata.create(primitives.metadata),
      occurredAt: EventOccurredAt.fromISOString(primitives.occurredAt),
      count: primitives.count || 1,
    });
  }

  /**
   * Convierte el agregado a primitivos para serialización
   */
  public toPrimitives(): TrackingEventPrimitives {
    return {
      id: this._id.getValue(),
      visitorId: this._visitorId.getValue(),
      sessionId: this._sessionId.getValue(),
      tenantId: this._tenantId.getValue(),
      siteId: this._siteId.getValue(),
      eventType: this._eventType.getValue(),
      metadata: this._metadata.getValue(),
      occurredAt: this._occurredAt.toISOString(),
      count: this._count,
    };
  }

  // Getters
  public getId(): TrackingEventId {
    return this._id;
  }

  public getVisitorId(): VisitorId {
    return this._visitorId;
  }

  public getSessionId(): SessionId {
    return this._sessionId;
  }

  public getTenantId(): TenantId {
    return this._tenantId;
  }

  public getSiteId(): SiteId {
    return this._siteId;
  }

  public getEventType(): EventType {
    return this._eventType;
  }

  public getMetadata(): EventMetadata {
    return this._metadata;
  }

  public getOccurredAt(): EventOccurredAt {
    return this._occurredAt;
  }

  public getCount(): number {
    return this._count;
  }

  /**
   * Incrementa el contador para agregación
   * Usado cuando se consolidan eventos duplicados
   */
  public incrementCount(amount: number = 1): void {
    this._count += amount;
  }

  /**
   * Verifica si este evento puede agregarse con otro
   * Dos eventos se pueden agregar si son del mismo tipo, visitante, sesión y tienen metadata igual
   */
  public canAggregateWith(other: TrackingEvent): boolean {
    return (
      this._visitorId.equals(other._visitorId) &&
      this._sessionId.equals(other._sessionId) &&
      this._eventType.equals(other._eventType) &&
      this._metadata.equals(other._metadata) &&
      this._occurredAt.isWithinWindow(other._occurredAt, 60000) // 1 minuto
    );
  }

  /**
   * Verifica si el evento es de alta frecuencia (requiere throttling)
   */
  public isHighFrequency(): boolean {
    return this._eventType.isHighFrequency();
  }

  /**
   * Verifica si el evento es crítico (no se debe descartar)
   */
  public isCritical(): boolean {
    return this._eventType.isCritical();
  }

  /**
   * Obtiene la clave de partición para este evento (año_mes)
   */
  public getPartitionKey(): string {
    return this._occurredAt.getPartitionKey();
  }

  /**
   * Genera una clave única para deduplicación/agregación
   * Formato: {visitorId}:{sessionId}:{eventType}:{metadataHash}
   */
  public getAggregationKey(): string {
    const metadataHash = this.hashMetadata();
    return `${this._visitorId.getValue()}:${this._sessionId.getValue()}:${this._eventType.getValue()}:${metadataHash}`;
  }

  /**
   * Hash simple de metadata para deduplicación
   */
  private hashMetadata(): string {
    const str = JSON.stringify(this._metadata.getValue());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}
