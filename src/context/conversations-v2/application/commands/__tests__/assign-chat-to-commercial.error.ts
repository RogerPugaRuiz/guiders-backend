import { DomainError } from '../../../../shared/domain/domain.error';

export class AssignChatToCommercialError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
