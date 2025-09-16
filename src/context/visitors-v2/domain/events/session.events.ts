import { DomainEvent } from '../../../shared/domain/domain-event';

export interface SessionStartedEventPayload {
  readonly visitorId: string;
  readonly sessionId: string;
  readonly startedAt: string;
}

/**
 * Evento de dominio: Se ha iniciado una nueva sesión para un visitante
 */
export class SessionStartedEvent extends DomainEvent<SessionStartedEventPayload> {
  constructor(payload: SessionStartedEventPayload) {
    super(payload);
  }
}

export interface SessionEndedEventPayload {
  readonly visitorId: string;
  readonly sessionId: string;
  readonly endedAt: string;
  readonly duration: number; // en milisegundos
}

/**
 * Evento de dominio: Se ha finalizado una sesión de un visitante
 */
export class SessionEndedEvent extends DomainEvent<SessionEndedEventPayload> {
  constructor(payload: SessionEndedEventPayload) {
    super(payload);
  }
}
