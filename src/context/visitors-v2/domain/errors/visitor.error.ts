import { DomainError } from '../../../shared/domain/domain.error';

/**
 * Error cuando ocurre un problema de persistencia con Visitor
 */
export class VisitorPersistenceError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'VisitorPersistenceError';
  }
}

/**
 * Error cuando no se encuentra un Visitor
 */
export class VisitorNotFoundError extends DomainError {
  constructor() {
    super('Visitante no encontrado');
    this.name = 'VisitorNotFoundError';
  }
}

/**
 * Error cuando se intenta una transición de estado inválida
 */
export class InvalidVisitorStateTransitionError extends DomainError {
  constructor(currentState: string, attemptedState: string) {
    super(
      `Transición de estado inválida de ${currentState} a ${attemptedState}`,
    );
    this.name = 'InvalidVisitorStateTransitionError';
  }
}

/**
 * Error cuando los datos del visitante son inválidos
 */
export class VisitorDataError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'VisitorDataError';
  }
}
