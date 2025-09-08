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
  private config?: openid.Configuration;

  // Variables de entorno requeridas para configurar el cliente OIDC
  private issuerUrl = process.env.OIDC_ISSUER!; // p.ej. https://sso.guiders.es/realms/guiders
  private clientId = process.env.OIDC_CLIENT_ID!; // p.ej. console
  private redirect = process.env.OIDC_REDIRECT_URI!; // p.ej. https://guiders.es/api/bff/auth/callback/console
  private scope = process.env.OIDC_SCOPE || 'openid profile email';

  async onModuleInit() {
    // Carga ESM en entorno CommonJS
    const client = await import('openid-client');
    this.clientLib = client;
    // Intento discovery no bloqueante
    await this.ensureConfig(true);
    if (this.config) {
      this.logger.log(
        `OIDC listo: ${this.issuerUrl} client_id=${this.clientId}`,
      );
    }
  }

  // Intenta configurar discovery; si silent=true no lanza error (útil en bootstrap)
  private async ensureConfig(silent = false): Promise<void> {
    if (this.config) return;
    const client = this.clientLib;
    const allowInsecure =
      this.issuerUrl.startsWith('http://') ||
      process.env.NODE_ENV !== 'production';
    const issuerURL = new URL(this.issuerUrl);
    const discoveryUrlOverride = process.env.OIDC_DISCOVERY_URL;
    const algorithmEnv = (process.env.OIDC_DISCOVERY_ALGORITHM || 'oidc') as
      | 'oidc'
      | 'oauth2';
    const initialAlgorithm: 'oidc' | 'oauth2' = algorithmEnv;

    const baseOptions = allowInsecure
      ? { execute: [client.allowInsecureRequests], algorithm: algorithmEnv }
      : { algorithm: algorithmEnv };

    const tryDiscovery = async (url: URL, algorithm: 'oidc' | 'oauth2') =>
      client.discovery(
        url,
        this.clientId,
        {
          token_endpoint_auth_method: 'none',
          redirect_uris: [this.redirect],
          response_types: ['code'],
        },
        undefined,
        allowInsecure
          ? { execute: [client.allowInsecureRequests], algorithm }
          : { algorithm },
      );

    try {
      this.config = await tryDiscovery(
        discoveryUrlOverride ? new URL(discoveryUrlOverride) : issuerURL,
        initialAlgorithm,
      );
    } catch {
      const altAlgorithm = initialAlgorithm === 'oidc' ? 'oauth2' : 'oidc';
      try {
        this.config = await tryDiscovery(
          discoveryUrlOverride ? new URL(discoveryUrlOverride) : issuerURL,
          altAlgorithm,
        );
      } catch {
        // Intentos con rutas conocidas
        const docUrl1 = new URL(
          issuerURL.pathname.endsWith('/')
            ? `${issuerURL.pathname}.well-known/openid-configuration`
            : `${issuerURL.pathname}/.well-known/openid-configuration`,
          `${issuerURL.protocol}//${issuerURL.host}`,
        );
        try {
          this.config = await tryDiscovery(docUrl1, baseOptions.algorithm);
        } catch {
          const legacyPath = issuerURL.pathname.startsWith('/auth')
            ? issuerURL.pathname
            : `/auth${issuerURL.pathname}`;
          const docUrl2 = new URL(
            legacyPath.endsWith('/')
              ? `${legacyPath}.well-known/openid-configuration`
              : `${legacyPath}/.well-known/openid-configuration`,
            `${issuerURL.protocol}//${issuerURL.host}`,
          );
          try {
            this.config = await tryDiscovery(docUrl2, baseOptions.algorithm);
          } catch (e4) {
            if (silent) {
              this.logger.warn(
                'No se pudo completar discovery OIDC durante el bootstrap. Se reintentará bajo demanda.',
              );
              return;
            }
            throw e4;
          }
        }
      }
    }

    if (allowInsecure) {
      this.logger.warn(
        'OIDC en modo inseguro (HTTP) habilitado por entorno de desarrollo. No usar en producción.',
      );
    }
  }

  // Construye redirect_uri para una app concreta si se solicita
  private deriveRedirect(app?: string): string {
    if (!this.redirect) {
      throw new Error(
        'OIDC_REDIRECT_URI no está configurado. Define la variable de entorno con la URL absoluta del callback (ej: http://localhost:3000/api/bff/auth/callback/console).',
      );
    }
    if (!app) return this.redirect;
    try {
      const u = new URL(this.redirect);
      // Reemplaza el último segmento tras /callback/
      u.pathname = u.pathname.replace(/(\/callback\/)[^/]+$/, `$1${app}`);
      return u.toString();
    } catch {
      return this.redirect;
    }
  }

  // Devuelve la URL de autorización para redirigir al usuario (string)
  async buildAuthUrl(
    sess: OidcSessionFields,
    opts?: { app?: string; redirectUri?: string },
  ): Promise<string> {
    await this.ensureConfig();
    const c = this.clientLib;
    const redirectUri = opts?.redirectUri || this.deriveRedirect(opts?.app);
    const code_verifier = c.randomPKCECodeVerifier();
    const code_challenge = await c.calculatePKCECodeChallenge(code_verifier);
    const state = c.randomState();
    const nonce = c.randomNonce();

    Object.assign(sess, {
      pkce_verifier: code_verifier,
      oidc_state: state,
      oidc_nonce: nonce,
    });

    const url = c.buildAuthorizationUrl(this.config as openid.Configuration, {
      redirect_uri: redirectUri,
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
    opts?: { app?: string; redirectUri?: string },
  ): Promise<
    openid.TokenEndpointResponse & openid.TokenEndpointResponseHelpers
  > {
    await this.ensureConfig();
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
    const currentUrl = new URL(
      opts?.redirectUri || this.deriveRedirect(opts?.app),
    );
    for (const [k, v] of Object.entries(query || {})) {
      if (Array.isArray(v)) {
        for (const vv of v) currentUrl.searchParams.append(k, String(vv));
      } else if (v !== undefined && v !== null) {
        currentUrl.searchParams.set(k, String(v));
      }
    }

    return c.authorizationCodeGrant(
      this.config as openid.Configuration,
      currentUrl,
      {
        pkceCodeVerifier: code_verifier,
        expectedState: state,
        expectedNonce: nonce,
      },
    );
  }

  // Usa Refresh Token para obtener nuevos tokens
  async refresh(refreshToken: string) {
    await this.ensureConfig();
    return this.clientLib.refreshTokenGrant(
      this.config as openid.Configuration,
      refreshToken,
    );
  }

  // Revoca el refresh token (ignora fallo de revocación)
  async revoke(refreshToken: string) {
    await this.ensureConfig();
    return this.clientLib
      .tokenRevocation(this.config as openid.Configuration, refreshToken, {
        token_type_hint: 'refresh_token',
      })
      .catch(() => void 0);
  }
}
