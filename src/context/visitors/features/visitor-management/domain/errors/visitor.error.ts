import { DomainError } from 'src/context/shared/domain/domain.error';

/**
 * Error que ocurre cuando hay problemas de persistencia con un visitante
 */
export class VisitorPersistenceError extends DomainError {
  constructor(message: string) {
    super(`Error de persistencia de visitante: ${message}`);
  }
}

/**
 * Error que ocurre cuando no se encuentra un visitante
 */
export class VisitorNotFoundError extends DomainError {
  constructor(visitorId: string) {
    super(`Visitante con ID ${visitorId} no encontrado`);
  }
}

/**
 * Error que ocurre cuando hay un problema con los datos del visitante
 */
export class VisitorDataError extends DomainError {
  constructor(message: string) {
    super(`Error en datos del visitante: ${message}`);
  }
}
