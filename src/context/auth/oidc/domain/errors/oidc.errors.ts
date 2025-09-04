import { DomainError } from 'src/context/shared/domain/domain.error';

export class OidcProviderError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class OidcAuthenticationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class OidcConfigurationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
