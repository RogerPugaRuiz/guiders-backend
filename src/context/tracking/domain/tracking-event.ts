import { AggregateRoot } from '@nestjs/cqrs';
import { TrackingEventId } from './value-objects/tracking-event-id';
import { VisitorId } from './value-objects/visitor-id';
import { EventType } from './value-objects/event-type';
import { TrackingEventMetadata } from './value-objects/tracking-event-metadata';
import { TrackingEventOccurredAt } from './value-objects/tracking-event-occurred-at';
import { TrackingEventCreatedEvent } from './events/tracking-event-created-event';

export interface TrackingEventPrimitives {
  id: string;
  visitorId: string;
  eventType: string;
  metadata: Record<string, any>;
  occurredAt: Date;
}

export class TrackingEvent extends AggregateRoot {
  // Constructor privado para forzar el uso de los métodos de fábrica
  private constructor(
    private readonly _id: TrackingEventId,
    private readonly _visitorId: VisitorId,
    private readonly _eventType: EventType,
    private readonly _metadata: TrackingEventMetadata,
    private readonly _occurredAt: TrackingEventOccurredAt,
  ) {
    super();
  }

  // Método de fábrica para crear la entidad desde value objects
  public static create(params: {
    id: TrackingEventId;
    visitorId: VisitorId;
    eventType: EventType;
    metadata: TrackingEventMetadata;
    occurredAt?: TrackingEventOccurredAt | string | number | Date;
  }): TrackingEvent {
    let occurredAt: TrackingEventOccurredAt;
    if (!params.occurredAt) {
      occurredAt = TrackingEventOccurredAt.create(new Date());
    } else if (params.occurredAt instanceof TrackingEventOccurredAt) {
      occurredAt = params.occurredAt;
    } else {
      occurredAt = TrackingEventOccurredAt.create(params.occurredAt);
    }
    // Instancia la entidad
    const trackingEvent = new TrackingEvent(
      params.id,
      params.visitorId,
      params.eventType,
      params.metadata,
      occurredAt,
    );
    // Aplica el evento de dominio al crear la entidad
    trackingEvent.apply(
      new TrackingEventCreatedEvent({
        id: params.id.value,
        visitorId: params.visitorId.value,
        eventType: params.eventType.value,
        metadata: params.metadata.value,
        occurredAt: occurredAt.value,
      }),
    );
    return trackingEvent;
  }

  // Método de fábrica para reconstruir la entidad desde datos primitivos
  public static fromPrimitives(params: {
    id: string;
    visitorId: string;
    eventType: string;
    metadata: Record<string, any>;
    occurredAt: string | number | Date;
  }): TrackingEvent {
    return new TrackingEvent(
      TrackingEventId.create(params.id),
      VisitorId.create(params.visitorId),
      EventType.create(params.eventType),
      TrackingEventMetadata.create(params.metadata),
      TrackingEventOccurredAt.create(params.occurredAt),
    );
  }

  // Serializa la entidad a un objeto plano
  public toPrimitives(): TrackingEventPrimitives {
    return {
      id: this._id.value,
      visitorId: this._visitorId.value,
      eventType: this._eventType.value,
      metadata: this._metadata.value,
      occurredAt: this._occurredAt.value,
    };
  }

  // Getters para exponer propiedades de solo lectura si es necesario
  get id(): TrackingEventId {
    return this._id;
  }

  get visitorId(): VisitorId {
    return this._visitorId;
  }

  get eventType(): EventType {
    return this._eventType;
  }

  get metadata(): TrackingEventMetadata {
    return this._metadata;
  }

  get occurredAt(): TrackingEventOccurredAt {
    return this._occurredAt;
  }
}
