import { DomainError } from 'src/context/shared/domain/domain.error';
export class ConnectionNotFoundError extends Error {
  constructor(userId: string) {
    super(`La conexión no fue encontrada para el usuario: ${userId}`);
    this.name = 'ConnectionNotFoundError';
  }
}

export class SendMessageToVisitorError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'SendMessageToVisitorError';
  }
}

export class SendMessageToCommercialError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'SendMessageToCommercialError';
  }
}

export class UserNotConnectedError extends DomainError {
  constructor(userId: string) {
    super(`El usuario no está conectado: ${userId}`);
    this.name = 'UserNotConnectedError';
  }
}
