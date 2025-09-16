import { DomainError } from '../../../shared/domain/domain.error';

/**
 * Error cuando ocurre un problema de persistencia con VisitorV2
 */
export class VisitorV2PersistenceError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'VisitorV2PersistenceError';
  }
}

/**
 * Error cuando no se encuentra un VisitorV2
 */
export class VisitorV2NotFoundError extends DomainError {
  constructor() {
    super('Visitante no encontrado');
    this.name = 'VisitorV2NotFoundError';
  }
}

/**
 * Error cuando los datos del VisitorV2 son inválidos
 */
export class VisitorV2DataError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'VisitorV2DataError';
  }
}

/**
 * Error cuando el estado del visitante es inválido para la operación
 */
export class VisitorV2InvalidStateError extends DomainError {
  constructor(currentState: string, operation: string) {
    super(
      `No se puede realizar la operación '${operation}' en estado '${currentState}'`,
    );
    this.name = 'VisitorV2InvalidStateError';
  }
}
