import { DomainError } from '../../../shared/domain/domain.error';

/**
 * Error genérico para operaciones con consentimientos
 */
export class ConsentError extends DomainError {
  constructor(message: string) {
    super(`Error en consentimiento: ${message}`);
  }
}

/**
 * Error cuando no se encuentra un consentimiento
 */
export class ConsentNotFoundError extends DomainError {
  constructor(visitorId: string, consentType?: string) {
    super(
      `No se encontró consentimiento para visitante ${visitorId}${
        consentType ? ` del tipo ${consentType}` : ''
      }`,
    );
  }
}

/**
 * Error de persistencia en el repositorio de consentimientos
 */
export class ConsentPersistenceError extends DomainError {
  constructor(message: string) {
    super(`Error al persistir consentimiento: ${message}`);
  }
}

/**
 * Error cuando los datos del consentimiento son inválidos
 */
export class ConsentDataError extends DomainError {
  constructor(message: string) {
    super(`Datos de consentimiento inválidos: ${message}`);
  }
}

/**
 * Error cuando el estado del consentimiento es inválido para la operación
 */
export class ConsentInvalidStateError extends DomainError {
  constructor(currentState: string, operation: string) {
    super(
      `No se puede realizar la operación '${operation}' en estado '${currentState}'`,
    );
  }
}
