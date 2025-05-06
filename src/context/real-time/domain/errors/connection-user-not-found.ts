import { DomainError } from 'src/context/shared/domain/domain.error';

export class ConnectionUserNotFound extends DomainError {
  constructor(userId?: string) {
    super(`Connection user not found: ${userId}`);
  }
}

export class RealTimeMessageSenderError extends DomainError {
  constructor(message: string) {
    super(`${message}`);
  }
}
