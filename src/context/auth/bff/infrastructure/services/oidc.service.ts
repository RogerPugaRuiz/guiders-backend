// src/context/auth/bff/infrastructure/services/oidc.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type * as openid from 'openid-client';

// Tipos mínimos para evitar any en sesión y query
type OidcSessionFields = {
  pkce_verifier?: string | undefined;
  oidc_state?: string | undefined;
  oidc_nonce?: string | undefined;
  // Sesiones de express-session permiten asignaciones arbitrarias
  [key: string]: unknown;
};

@Injectable()
export class OidcService implements OnModuleInit {
  private readonly logger = new Logger(OidcService.name);

  // Librería ESM (se carga dinámicamente para compatibilidad con CJS)
  private clientLib!: typeof import('openid-client');
  // Configuración descubierta del Authorization Server + metadata de cliente
  private config!: openid.Configuration;

  // Variables de entorno requeridas para configurar el cliente OIDC
  private issuerUrl = process.env.OIDC_ISSUER!; // p.ej. https://sso.guiders.es/realms/guiders
  private clientId = process.env.OIDC_CLIENT_ID!; // p.ej. console
  private redirect = process.env.OIDC_REDIRECT_URI!; // p.ej. https://guiders.es/api/bff/auth/callback/console
  private scope = process.env.OIDC_SCOPE || 'openid profile email';

  async onModuleInit() {
    // Carga ESM en entorno CommonJS
    const client = await import('openid-client');
    this.clientLib = client;

    // Descubrimiento OIDC (v6 API)
    this.config = await client.discovery(
      new URL(this.issuerUrl),
      this.clientId,
      {
        token_endpoint_auth_method: 'none',
        redirect_uris: [this.redirect],
        response_types: ['code'],
      },
    );

    this.logger.log(`OIDC listo: ${this.issuerUrl} client_id=${this.clientId}`);
  }

  // Devuelve la URL de autorización para redirigir al usuario (string)
  async buildAuthUrl(sess: OidcSessionFields): Promise<string> {
    const c = this.clientLib;
    const code_verifier = c.randomPKCECodeVerifier();
    const code_challenge = await c.calculatePKCECodeChallenge(code_verifier);
    const state = c.randomState();
    const nonce = c.randomNonce();

    Object.assign(sess, {
      pkce_verifier: code_verifier,
      oidc_state: state,
      oidc_nonce: nonce,
    });

    const url = c.buildAuthorizationUrl(this.config, {
      redirect_uri: this.redirect,
      scope: this.scope,
      code_challenge,
      code_challenge_method: 'S256',
      state,
      nonce,
    });

    return url.href;
  }

  // Intercambia el authorization code por tokens (v6 API)
  async handleCallback(
    query: Record<string, string | string[]>,
    sess: OidcSessionFields,
  ): Promise<
    openid.TokenEndpointResponse & openid.TokenEndpointResponseHelpers
  > {
    const c = this.clientLib;

    const code_verifier = sess.pkce_verifier;
    const state = sess.oidc_state;
    const nonce = sess.oidc_nonce;
    delete sess.pkce_verifier;
    delete sess.oidc_state;
    delete sess.oidc_nonce;
    if (!code_verifier || !state || !nonce) {
      throw new Error('OIDC session mismatch');
    }

    // Reconstruimos la URL actual de callback con su query
    const currentUrl = new URL(this.redirect);
    for (const [k, v] of Object.entries(query || {})) {
      if (Array.isArray(v)) {
        for (const vv of v) currentUrl.searchParams.append(k, String(vv));
      } else if (v !== undefined && v !== null) {
        currentUrl.searchParams.set(k, String(v));
      }
    }

    return c.authorizationCodeGrant(this.config, currentUrl, {
      pkceCodeVerifier: code_verifier,
      expectedState: state,
      expectedNonce: nonce,
    });
  }

  // Usa Refresh Token para obtener nuevos tokens
  refresh(refreshToken: string) {
    return this.clientLib.refreshTokenGrant(this.config, refreshToken);
  }

  // Revoca el refresh token (ignora fallo de revocación)
  revoke(refreshToken: string) {
    return this.clientLib
      .tokenRevocation(this.config, refreshToken, {
        token_type_hint: 'refresh_token',
      })
      .catch(() => void 0);
  }
}
