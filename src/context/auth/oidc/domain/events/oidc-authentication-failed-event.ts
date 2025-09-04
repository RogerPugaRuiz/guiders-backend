import { DomainEvent } from 'src/context/shared/domain/domain-event';

export interface OidcAuthenticationFailedPayload {
  providerId: string;
  clientId: string;
  error: string;
  errorDescription?: string;
  userId?: string;
  timestamp: Date;
}

export class OidcAuthenticationFailedEvent extends DomainEvent<OidcAuthenticationFailedPayload> {}
