import { DomainError } from '../../../../../shared/domain/domain.error';

/**
 * Error que ocurre durante operaciones del repositorio de claims comerciales
 */
export class RepositoryError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'RepositoryError';
  }
}
