import { DomainError } from 'src/context/shared/domain/domain.error';

export class SaveMessageError extends DomainError {}

export class PaginateEndOfStreamError extends DomainError {
  constructor() {
    super('End of stream');
    this.name = 'PaginateEndOfStreamError';
  }
}

export class PaginateError extends DomainError {
  constructor() {
    super('An error occurred during pagination');
    this.name = 'PaginateError';
  }
}
