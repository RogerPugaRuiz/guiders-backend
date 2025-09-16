import { DomainEvent } from '../../../shared/domain/domain-event';

export interface VisitorCreatedEventPayload {
  readonly id: string;
  readonly domainId: string;
  readonly fingerprint: string;
  readonly state: string;
  readonly createdAt: string;
}

/**
 * Evento de dominio: Se ha creado un nuevo visitante
 */
export class VisitorCreatedEvent extends DomainEvent<VisitorCreatedEventPayload> {
  constructor(payload: VisitorCreatedEventPayload) {
    super(payload);
  }
}
