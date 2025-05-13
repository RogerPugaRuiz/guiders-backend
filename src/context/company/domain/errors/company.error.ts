// Error de dominio específico para la persistencia de Company
import { DomainError } from 'src/context/shared/domain/domain.error';

// Error cuando ocurre un problema de persistencia con Company
export class CompanyPersistenceError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'CompanyPersistenceError';
  }
}

// Error cuando no se encuentra una Company
export class CompanyNotFoundError extends DomainError {
  constructor() {
    super('Empresa no encontrada');
    this.name = 'CompanyNotFoundError';
  }
}
