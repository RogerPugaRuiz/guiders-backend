import { DomainEvent } from '../../../shared/domain/domain-event';

export interface VisitorLifecycleChangedEventPayload {
  readonly id: string;
  readonly previousLifecycle: string;
  readonly newLifecycle: string;
  readonly changedAt: string;
}

/**
 * Evento de dominio: Ha cambiado el ciclo de vida del visitante
 */
export class VisitorLifecycleChangedEvent extends DomainEvent<VisitorLifecycleChangedEventPayload> {
  constructor(payload: VisitorLifecycleChangedEventPayload) {
    super(payload);
  }
}

// Mantener el evento original por compatibilidad hacia atrás
export interface VisitorStateChangedEventPayload {
  readonly id: string;
  readonly previousState: string;
  readonly newState: string;
  readonly changedAt: string;
}

/**
 * Evento de dominio: Ha cambiado el estado del visitante
 * @deprecated Usar VisitorLifecycleChangedEvent en su lugar
 */
export class VisitorStateChangedEvent extends DomainEvent<VisitorStateChangedEventPayload> {
  constructor(payload: VisitorStateChangedEventPayload) {
    super(payload);
  }
}
