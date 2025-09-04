/*
 * Servicio de bajo nivel para interacción con openid-client.
 * Nota: openid-client expone funciones tipadas, pero algunas regresan tipos genéricos
 * que gatillan reglas no-unsafe-*; se tipan explícitamente las respuestas clave.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import * as openidClient from 'openid-client';
import { OidcProvider } from '../../domain/oidc-provider';

export const OIDC_CLIENT_SERVICE = Symbol('OidcClientService');

export interface OidcAuthenticationUrl {
  authUrl: string;
  state: string;
  codeVerifier?: string;
}
export interface OidcUserInfo {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  [k: string]: unknown;
}
export interface OidcTokens {
  accessToken: string;
  refreshToken?: string;
  idToken: string;
  userInfo: OidcUserInfo;
}

@Injectable()
export class OidcClientService {
  private readonly configCache = new Map<string, openidClient.Configuration>();

  async getConfiguration(
    provider: OidcProvider,
  ): Promise<openidClient.Configuration> {
    const cacheKey = provider.id.value;
    const cached = this.configCache.get(cacheKey);
    if (cached) return cached;
    const config = await openidClient.discovery(
      new URL(provider.issuerUrl.value),
      provider.clientId.value,
      provider.clientSecret.value,
    );
    this.configCache.set(cacheKey, config);
    return config;
  }

  async generateAuthenticationUrl(
    provider: OidcProvider,
    redirectUri: string,
  ): Promise<OidcAuthenticationUrl> {
    const config = await this.getConfiguration(provider);
    const state = openidClient.randomState();
    const codeVerifier = openidClient.randomPKCECodeVerifier();
    const codeChallenge =
      await openidClient.calculatePKCECodeChallenge(codeVerifier);
    // openid-client v6 no expone AuthorizationUrlParameters como tipo exportado en el namespace.
    // Hacemos un cast explícito para evitar el error TS2694 manteniendo validación en runtime por la librería.
    const authUrl = openidClient.buildAuthorizationUrl(config, {
      scope: provider.scopes.toPrimitives().join(' '),
      state,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    } as unknown as Record<string, string>);
    return { authUrl: authUrl.toString(), state, codeVerifier };
  }

  async exchangeCodeForTokens(
    provider: OidcProvider,
    code: string,
    redirectUri: string,
    codeVerifier: string,
    state?: string,
  ): Promise<OidcTokens> {
    const config = await this.getConfiguration(provider);
    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('code', code);
    if (state) callbackUrl.searchParams.set('state', state);
    const tokens = await openidClient.authorizationCodeGrant(
      config,
      callbackUrl,
      { pkceCodeVerifier: codeVerifier, expectedState: state },
    );
    const userInfo: OidcUserInfo = {};
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || undefined,
      idToken: tokens.id_token || '',
      userInfo,
    };
  }

  async refreshTokens(provider: OidcProvider, refreshToken: string) {
    const config = await this.getConfiguration(provider);
    const refreshed = await openidClient.refreshTokenGrant(
      config,
      refreshToken,
    );
    return refreshed;
  }
}
