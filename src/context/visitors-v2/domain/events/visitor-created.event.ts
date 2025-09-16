import { DomainEvent } from '../../../shared/domain/domain-event';

export interface VisitorCreatedEventPayload {
  readonly id: string;
  readonly tenantId: string;
  readonly siteId: string;
  readonly fingerprint: string;
  readonly lifecycle: string;
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
