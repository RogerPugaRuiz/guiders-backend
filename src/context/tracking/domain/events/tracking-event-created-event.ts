import { DomainEvent } from 'src/context/shared/domain/domain-event';

// Evento de dominio que representa la creación de un TrackingEvent
export class TrackingEventCreatedEvent extends DomainEvent<{
  id: string;
  visitorId: string;
  eventType: string;
  metadata: Record<string, any>;
  occurredAt: Date;
}> {}
