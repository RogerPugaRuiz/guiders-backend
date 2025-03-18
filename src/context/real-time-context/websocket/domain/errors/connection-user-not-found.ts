import { DomainError } from 'src/context/shared/domain/domain.error';

export class ConnectionUserNotFound extends DomainError {
  details?: string | Record<string, unknown> | undefined;
  message: string;
  constructor(userId?: string) {
    super();
    this.message = 'Connection user not found';
    this.details = {
      userId,
    };
  }
}
