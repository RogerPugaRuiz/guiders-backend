import { DomainError } from '../domain.error';

export class RepositoryError extends DomainError {
  protected name: string = 'RepositoryError';
  constructor() {
    super('Repository connection error');
  }
}
