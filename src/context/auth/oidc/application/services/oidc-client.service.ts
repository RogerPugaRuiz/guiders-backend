import { Injectable } from '@nestjs/common';
import * as openidClient from 'openid-client';
import { OidcProvider } from '../../domain/oidc-provider';

export const OIDC_CLIENT_SERVICE = Symbol('OidcClientService');

export interface OidcAuthenticationUrl {
  authUrl: string;
  state: string;
  codeVerifier?: string;
}

export interface OidcTokens {
  accessToken: string;
  refreshToken?: string;
  idToken: string;
  userInfo: any; // UserInfo response from OIDC provider
}

@Injectable()
export class OidcClientService {
  private configCache = new Map<string, openidClient.Configuration>();

  async getConfiguration(provider: OidcProvider): Promise<openidClient.Configuration> {
    const cacheKey = provider.id.value;
    
    if (this.configCache.has(cacheKey)) {
      return this.configCache.get(cacheKey)!;
    }

    try {
      const config = await openidClient.discovery(
        new URL(provider.issuerUrl.value),
        provider.clientId.value,
        provider.clientSecret.value,
      );

      this.configCache.set(cacheKey, config);
      return config;
    } catch (error) {
      throw new Error(`Error al crear configuración OIDC para el proveedor ${provider.name}: ${error}`);
    }
  }

  async generateAuthenticationUrl(
    provider: OidcProvider,
    redirectUri: string,
  ): Promise<OidcAuthenticationUrl> {
    const config = await this.getConfiguration(provider);
    const state = openidClient.randomState();
    const codeVerifier = openidClient.randomPKCECodeVerifier();
    const codeChallenge = await openidClient.calculatePKCECodeChallenge(codeVerifier);
    
    const authUrl = openidClient.buildAuthorizationUrl(config, {
      scope: provider.scopes.toPrimitives().join(' '),
      state,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return {
      authUrl: authUrl.toString(),
      state,
      codeVerifier,
    };
  }

  async exchangeCodeForTokens(
    provider: OidcProvider,
    code: string,
    redirectUri: string,
    codeVerifier: string,
    state?: string,
  ): Promise<OidcTokens> {
    const config = await this.getConfiguration(provider);

    try {
      // Construct the callback URL with the authorization code
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('code', code);
      if (state) {
        callbackUrl.searchParams.set('state', state);
      }

      const tokens = await openidClient.authorizationCodeGrant(
        config,
        callbackUrl,
        { 
          pkceCodeVerifier: codeVerifier,
          expectedState: state 
        }
      );
      
      // Skip user info for now if we have issues with the API
      // const userInfo = await openidClient.fetchUserInfo(config, tokens.access_token, '');
      const userInfo = {}; // Will be populated from ID token claims instead

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        idToken: tokens.id_token || '',
        userInfo,
      };
    } catch (error) {
      throw new Error(`Error al intercambiar código por tokens: ${error}`);
    }
  }

  async refreshTokens(
    provider: OidcProvider,
    refreshToken: string,
  ): Promise<any> {
    const config = await this.getConfiguration(provider);

    try {
      return await openidClient.refreshTokenGrant(config, refreshToken);
    } catch (error) {
      throw new Error(`Error al renovar tokens: ${error}`);
    }
  }

  private generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
}