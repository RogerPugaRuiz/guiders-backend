import { DomainEvent } from 'src/context/shared/domain/domain-event';

export interface OidcAuthenticationCompletedPayload {
  providerId: string;
  clientId: string;
  userId: string;
  userInfo: {
    sub: string;
    email?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };
  accessToken: string;
  refreshToken?: string;
  idToken: string;
  timestamp: Date;
}

export class OidcAuthenticationCompletedEvent extends DomainEvent<OidcAuthenticationCompletedPayload> {}
