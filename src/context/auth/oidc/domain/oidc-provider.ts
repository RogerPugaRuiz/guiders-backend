import { AggregateRoot } from '@nestjs/cqrs';
import { OidcProviderId } from './value-objects/oidc-provider-id';
import { OidcClientId } from './value-objects/oidc-client-id';
import { OidcClientSecret } from './value-objects/oidc-client-secret';
import { OidcIssuerUrl } from './value-objects/oidc-issuer-url';
import { OidcScopes } from './value-objects/oidc-scopes';
import { OidcAuthenticationStartedEvent } from './events/oidc-authentication-started-event';
import { OidcAuthenticationCompletedEvent } from './events/oidc-authentication-completed-event';
import { OidcAuthenticationFailedEvent } from './events/oidc-authentication-failed-event';

// Información básica de usuario OIDC utilizada en eventos
interface OidcUserInfo {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  [key: string]: unknown; // campos adicionales no tipados específicamente
}

// Interfaz para serializar la entidad a primitivos
export interface OidcProviderPrimitives {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  scopes: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OidcProviderProperties {
  id: OidcProviderId;
  name: string;
  clientId: OidcClientId;
  clientSecret: OidcClientSecret;
  issuerUrl: OidcIssuerUrl;
  scopes: OidcScopes;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Entidad OidcProvider como AggregateRoot siguiendo DDD
export class OidcProvider extends AggregateRoot {
  private constructor(
    private readonly _id: OidcProviderId,
    private readonly _name: string,
    private readonly _clientId: OidcClientId,
    private readonly _clientSecret: OidcClientSecret,
    private readonly _issuerUrl: OidcIssuerUrl,
    private readonly _scopes: OidcScopes,
    private readonly _enabled: boolean,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date,
  ) {
    super();
  }

  // Método de fábrica para crear un proveedor OIDC
  public static create(props: OidcProviderProperties): OidcProvider {
    const provider = new OidcProvider(
      props.id,
      props.name,
      props.clientId,
      props.clientSecret,
      props.issuerUrl,
      props.scopes,
      props.enabled,
      props.createdAt,
      props.updatedAt,
    );
    return provider;
  }

  // Método de fábrica para reconstruir desde datos primitivos
  public static fromPrimitives(params: {
    id: string;
    name: string;
    clientId: string;
    clientSecret: string;
    issuerUrl: string;
    scopes: string[];
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): OidcProvider {
    return new OidcProvider(
      OidcProviderId.create(params.id),
      params.name,
      OidcClientId.create(params.clientId),
      OidcClientSecret.create(params.clientSecret),
      OidcIssuerUrl.create(params.issuerUrl),
      OidcScopes.fromPrimitives(params.scopes),
      params.enabled,
      params.createdAt,
      params.updatedAt,
    );
  }

  // Serializa la entidad a un objeto plano
  public toPrimitives(): OidcProviderPrimitives {
    return {
      id: this._id.value,
      name: this._name,
      clientId: this._clientId.value,
      clientSecret: this._clientSecret.value,
      issuerUrl: this._issuerUrl.value,
      scopes: this._scopes.toPrimitives(),
      enabled: this._enabled,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  // Emite evento cuando se inicia la autenticación
  public startAuthentication(redirectUrl: string, userId?: string): void {
    this.apply(
      new OidcAuthenticationStartedEvent({
        providerId: this._id.value,
        clientId: this._clientId.value,
        userId,
        redirectUrl,
        timestamp: new Date(),
      }),
    );
  }

  // Emite evento cuando se completa la autenticación
  public completeAuthentication(
    userInfo: OidcUserInfo,
    tokens: { accessToken: string; refreshToken?: string; idToken: string },
    userId: string,
  ): void {
    this.apply(
      new OidcAuthenticationCompletedEvent({
        providerId: this._id.value,
        clientId: this._clientId.value,
        userId,
        userInfo,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        idToken: tokens.idToken,
        timestamp: new Date(),
      }),
    );
  }

  // Emite evento cuando falla la autenticación
  public failAuthentication(
    error: string,
    errorDescription?: string,
    userId?: string,
  ): void {
    this.apply(
      new OidcAuthenticationFailedEvent({
        providerId: this._id.value,
        clientId: this._clientId.value,
        error,
        errorDescription,
        userId,
        timestamp: new Date(),
      }),
    );
  }

  // Getters de solo lectura
  get id(): OidcProviderId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get clientId(): OidcClientId {
    return this._clientId;
  }

  get clientSecret(): OidcClientSecret {
    return this._clientSecret;
  }

  get issuerUrl(): OidcIssuerUrl {
    return this._issuerUrl;
  }

  get scopes(): OidcScopes {
    return this._scopes;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
