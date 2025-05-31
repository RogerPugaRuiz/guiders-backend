import { DomainError } from '../domain.error';

export class RepositoryError extends DomainError {
  constructor(message: string = 'Repository connection error') {
    super(message);
    this.name = 'RepositoryError';
  }
}
