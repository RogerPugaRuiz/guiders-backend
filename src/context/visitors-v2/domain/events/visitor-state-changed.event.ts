import { DomainEvent } from '../../../shared/domain/domain-event';

export interface VisitorStateChangedEventPayload {
  readonly id: string;
  readonly previousState: string;
  readonly newState: string;
  readonly changedAt: string;
}

/**
 * Evento de dominio: Ha cambiado el estado del visitante
 */
export class VisitorStateChangedEvent extends DomainEvent<VisitorStateChangedEventPayload> {
  constructor(payload: VisitorStateChangedEventPayload) {
    super(payload);
  }
}
