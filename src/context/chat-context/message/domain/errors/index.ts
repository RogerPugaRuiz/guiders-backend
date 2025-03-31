import { DomainError } from 'src/context/shared/domain/domain.error';

export class SaveMessageError extends DomainError {}

export class PaginateEndOfStreamError extends DomainError {
  protected name: string = 'PaginateEndOfStreamError';
  constructor() {
    super('End of stream');
  }
}
