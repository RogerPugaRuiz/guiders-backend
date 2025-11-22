import { DomainError } from '../../../shared/domain/domain.error';

/**
 * Error cuando ocurre un problema de persistencia con SavedFilter
 */
export class SavedFilterPersistenceError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'SavedFilterPersistenceError';
  }
}

/**
 * Error cuando no se encuentra un SavedFilter
 */
export class SavedFilterNotFoundError extends DomainError {
  constructor() {
    super('El filtro no fue encontrado');
    this.name = 'SavedFilterNotFoundError';
  }
}

/**
 * Error cuando se excede el límite de filtros guardados
 */
export class SavedFilterLimitExceededError extends DomainError {
  constructor(limit: number) {
    super(`Se ha alcanzado el límite máximo de ${limit} filtros guardados`);
    this.name = 'SavedFilterLimitExceededError';
  }
}

/**
 * Error cuando no se tiene permiso para acceder al filtro
 */
export class SavedFilterAccessDeniedError extends DomainError {
  constructor() {
    super('No tienes permiso para acceder a este filtro');
    this.name = 'SavedFilterAccessDeniedError';
  }
}
