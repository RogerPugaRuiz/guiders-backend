import { DomainError } from '../../../shared/domain/domain.error';

/**
 * Error que ocurre cuando hay problemas con el buffer de eventos
 */
export class BufferFlushError extends DomainError {
  constructor(message: string) {
    super(`Error al hacer flush del buffer: ${message}`);
  }
}

/**
 * Error que ocurre cuando hay problemas de persistencia con eventos de tracking
 */
export class TrackingEventPersistenceError extends DomainError {
  constructor(message: string) {
    super(`Error de persistencia de eventos de tracking: ${message}`);
  }
}

/**
 * Error que ocurre cuando no se encuentra un evento de tracking
 */
export class TrackingEventNotFoundError extends DomainError {
  constructor(eventId: string) {
    super(`Evento de tracking con ID ${eventId} no encontrado`);
  }
}
