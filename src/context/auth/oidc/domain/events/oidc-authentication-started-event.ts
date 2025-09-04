import { DomainEvent } from 'src/context/shared/domain/domain-event';

export interface OidcAuthenticationStartedPayload {
  providerId: string;
  clientId: string;
  userId?: string;
  redirectUrl: string;
  timestamp: Date;
}

export class OidcAuthenticationStartedEvent extends DomainEvent<OidcAuthenticationStartedPayload> {}