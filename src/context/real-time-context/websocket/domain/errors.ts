import { DomainError } from 'src/context/shared/domain/domain.error';
export class ConnectionNotFoundError extends Error {
  constructor(userId: string) {
    super(`La conexión no fue encontrada para el usuario: ${userId}`);
    this.name = 'ConnectionNotFoundError';
  }
}

export class SendMessageToVisitorError extends DomainError {
  message: string;
  details?: string | Record<string, unknown> | undefined;
  constructor(message: string) {
    super();
    this.message = message;
  }
}

export class SendMessageToCommercialError extends DomainError {
  message: string;
  details?: string | Record<string, unknown> | undefined;
  constructor(message: string) {
    super();
    this.message = message;
  }
}

export class UserNotConnectedError extends DomainError {
  message: string;
  details?: string | Record<string, unknown>;

  constructor(userId: string) {
    super();
    this.message = `User ${userId} is not connected`;
  }
}
