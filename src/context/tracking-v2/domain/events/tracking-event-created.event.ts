import { DomainEvent } from '../../../shared/domain/domain-event';

export interface TrackingEventCreatedEventPayload {
  readonly id: string;
  readonly visitorId: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly siteId: string;
  readonly eventType: string;
  readonly metadata: Record<string, any>;
  readonly occurredAt: string;
  readonly count: number;
}

/**
 * Evento de dominio: Se ha creado un nuevo evento de tracking
 */
export class TrackingEventCreatedEvent extends DomainEvent<TrackingEventCreatedEventPayload> {
  constructor(payload: TrackingEventCreatedEventPayload) {
    super(payload);
  }
}
