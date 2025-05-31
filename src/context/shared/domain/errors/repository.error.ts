import { DomainError } from '../domain.error';

export class RepositoryError extends DomainError {
  constructor() {
    super('Repository connection error');
    this.name = 'RepositoryError';
  }
}
