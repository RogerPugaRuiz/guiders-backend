import { DomainError } from 'src/context/shared/domain/domain.error';
export class ConnectionNotFoundError extends Error {
  constructor(userId: string) {
    super(`La conexión no fue encontrada para el usuario: ${userId}`);
    this.name = 'ConnectionNotFoundError';
  }
}

export class SendMessageToVisitorError extends DomainError {
  protected name: string = 'SendMessageToVisitorError';
  constructor(message: string) {
    super(message);
  }
}

export class SendMessageToCommercialError extends DomainError {
  protected name: string = 'SendMessageToCommercialError';
  constructor(message: string) {
    super(message);
  }
}

export class UserNotConnectedError extends DomainError {
  protected name: string = 'UserNotConnectedError';
  constructor(userId: string) {
    super(`El usuario no está conectado: ${userId}`);
  }
}
