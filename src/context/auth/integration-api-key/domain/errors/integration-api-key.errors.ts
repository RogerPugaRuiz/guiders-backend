import { DomainError } from 'src/context/shared/domain/domain.error';

export class IntegrationApiKeyNotFoundError extends DomainError {
  constructor(id: string) {
    super(`API Key de integración no encontrada: ${id}`);
  }
}

export class IntegrationApiKeyAlreadyRevokedError extends DomainError {
  constructor(id: string) {
    super(`La API Key de integración ya está revocada: ${id}`);
  }
}

export class IntegrationApiKeyUnauthorizedError extends DomainError {
  constructor() {
    super('API Key de integración inválida o revocada');
  }
}
