// src/context/auth/bff/infrastructure/controllers/bff-auth.controller.ts
import { Controller, Get, Post, Req, Res, Logger, Param } from '@nestjs/common';
import type { Request, Response } from 'express';
import { OidcService } from '../services/oidc.service';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

// Helpers de configuración en runtime para evitar valores congelados al cargar el módulo
function parseSameSite(value?: string): 'strict' | 'lax' | 'none' {
  const normalized = value?.toLowerCase();
  console.log('[BFF parseSameSite Debug]', {
    originalValue: value,
    normalized: normalized,
    willReturn:
      normalized === 'strict' || normalized === 'lax' || normalized === 'none'
        ? normalized
        : 'lax',
  });

  if (
    normalized === 'strict' ||
    normalized === 'lax' ||
    normalized === 'none'
  ) {
    return normalized;
  }
  return 'lax'; // Default seguro para desarrollo
}

function readCookieEnv() {
  // Nota: en local (HTTP) cookies secure=true no se guardan
  const secure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production';

  const cookieConfig = {
    sessionName: process.env.SESSION_COOKIE || 'console_session',
    refreshName: process.env.REFRESH_COOKIE || 'console_refresh',
    sameSite: parseSameSite(process.env.SAMESITE),
    path: process.env.COOKIE_PATH || '/',
    refreshPath: process.env.REFRESH_PATH || '/api/bff/auth/refresh',
    domain: process.env.COOKIE_DOMAIN || undefined,
    secure,
  } as const;

  // Log detallado de la configuración de cookies
  console.log('[BFF Cookie Config Debug]', {
    rawSameSite: process.env.SAMESITE,
    parsedSameSite: cookieConfig.sameSite,
    rawSecure: process.env.COOKIE_SECURE,
    parsedSecure: cookieConfig.secure,
    nodeEnv: process.env.NODE_ENV,
    sessionName: cookieConfig.sessionName,
    refreshName: cookieConfig.refreshName,
  });

  return cookieConfig;
}

function readAuthEnv() {
  return {
    issuer: process.env.OIDC_ISSUER,
    audience: process.env.API_AUDIENCE || 'guiders-api',
  } as const;
}
// Nota: JWKS se inicializa de forma perezosa para evitar fallos si OIDC_ISSUER no está definido al cargar el módulo.

// Obtiene allowlist de orígenes en runtime (evita leer antes de cargar .env)
function getAllowedReturnTo(): string[] {
  const raw = process.env.ALLOW_RETURN_TO || 'http://localhost:4200';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function sanitizeReturnTo(input?: string) {
  const allowed = getAllowedReturnTo();
  const fallback = allowed[0] || 'http://localhost:4200';
  try {
    const url = new URL(input || '/', fallback);
    if (!allowed.includes(url.origin)) return fallback + '/';
    return url.href;
  } catch {
    return fallback + '/';
  }
}

@Controller('bff/auth')
export class BffController {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;
  private readonly logger = new Logger(BffController.name);

  constructor(private readonly oidc: OidcService) {}

  // Inicializa/memoiza JWKS desde OIDC_JWKS_URI o derivado de OIDC_ISSUER
  private getJWKS() {
    if (this.jwks) return this.jwks;
    const jwksUri = process.env.OIDC_JWKS_URI;
    const issuer = process.env.OIDC_ISSUER;
    if (jwksUri) {
      this.jwks = createRemoteJWKSet(new URL(jwksUri));
      return this.jwks;
    }
    if (issuer) {
      const base = issuer.replace(/\/$/, '');
      this.jwks = createRemoteJWKSet(
        new URL(`${base}/protocol/openid-connect/certs`),
      );
      return this.jwks;
    }
    throw new Error('OIDC_ISSUER u OIDC_JWKS_URI no configurados');
  }

  @Get('login')
  async login(
    @Req()
    req: Request & {
      session: Record<string, unknown> & { returnTo?: string };
    },
    @Res() res: Response,
  ) {
    // Guarda a dónde volver
    const redirectParam =
      typeof req.query.redirect === 'string' ? req.query.redirect : undefined;
    const resolvedReturnTo = sanitizeReturnTo(redirectParam);
    this.logger.debug(
      `[BFF /login] redirectParam=${redirectParam ?? 'none'} => returnTo=${resolvedReturnTo}`,
    );
    req.session.returnTo = resolvedReturnTo;

    const authUrl = await this.oidc.buildAuthUrl(req.session);
    try {
      const u = new URL(authUrl);
      this.logger.debug(
        `[BFF /login] Auth URL -> ${u.origin}${u.pathname} (code_challenge=${u.searchParams.has('code_challenge')}, state=${u.searchParams.has('state')}, nonce=${u.searchParams.has('nonce')})`,
      );
    } catch {
      this.logger.debug(`[BFF /login] Auth URL construido`);
    }
    return res.redirect(authUrl);
  }

  @Get('login/:app')
  async loginForApp(
    @Param('app') app: string,
    @Req()
    req: Request & {
      session: Record<string, unknown> & { returnTo?: string };
    },
    @Res() res: Response,
  ) {
    const redirectParam =
      typeof req.query.redirect === 'string' ? req.query.redirect : undefined;
    const resolvedReturnTo = sanitizeReturnTo(redirectParam);
    this.logger.debug(
      `[BFF /login/${app}] redirectParam=${redirectParam ?? 'none'} => returnTo=${resolvedReturnTo}`,
    );
    req.session.returnTo = resolvedReturnTo;

    const authUrl = await this.oidc.buildAuthUrl(req.session, { app });
    try {
      const u = new URL(authUrl);
      this.logger.debug(
        `[BFF /login/${app}] Auth URL -> ${u.origin}${u.pathname} (code_challenge=${u.searchParams.has('code_challenge')}, state=${u.searchParams.has('state')}, nonce=${u.searchParams.has('nonce')})`,
      );
    } catch {
      this.logger.debug(`[BFF /login/${app}] Auth URL construido`);
    }
    return res.redirect(authUrl);
  }

  @Get('callback/:app')
  async callback(
    @Req()
    req: Request & {
      session: Record<string, unknown> & { returnTo?: string };
      cookies: Record<string, string | undefined>;
      query: Record<string, string | string[]>;
    },
    @Res() res: Response,
  ) {
    let tokens: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };
    try {
      const sessKeys = Object.keys(req.session || {});
      const queryKeys = Object.keys(
        (req.query || {}) as Record<string, unknown>,
      );
      this.logger.debug(
        `[BFF /callback] sessionKeys=[${sessKeys.join(', ')}] queryKeys=[${queryKeys.join(', ')}]`,
      );
      const app = (req.params as Record<string, string | undefined>)?.['app'];
      tokens = await this.oidc.handleCallback(req.query, req.session, {
        app,
      });
    } catch (e) {
      // Si falta la sesión PKCE/state/nonce o hay cualquier error, reintenta login limpio
      const reason =
        e instanceof Error && /session|state|nonce/i.test(e.message)
          ? 'session_mismatch'
          : 'callback_error';
      return res.redirect(`/api/bff/auth/login?reason=${reason}`);
    }

    // Cookies HttpOnly
    const cenv = readCookieEnv();
    this.logger.debug(
      `[BFF /callback] tokens: access=present refresh=${tokens.refresh_token ? 'present' : 'none'} exp_in=${tokens.expires_in ?? 'n/a'}`,
    );

    // Log detallado de la configuración de cookies antes de establecerlas
    this.logger.debug(
      `[BFF /callback] Cookie Config Debug: ${JSON.stringify({
        sessionName: cenv.sessionName,
        refreshName: cenv.refreshName,
        sameSite: cenv.sameSite,
        secure: cenv.secure,
        path: cenv.path,
        refreshPath: cenv.refreshPath,
        domain: cenv.domain,
      })}`,
    );

    const sessionCookieOptions = {
      httpOnly: true,
      secure: cenv.secure,
      sameSite: cenv.sameSite,
      domain: cenv.domain,
      path: cenv.path,
      maxAge: (tokens.expires_in ? tokens.expires_in : 600) * 1000,
    };

    this.logger.debug(
      `[BFF /callback] Setting session cookie with options: ${JSON.stringify(sessionCookieOptions)}`,
    );
    this.logger.debug(
      `[BFF /callback] set-cookie session name=${cenv.sessionName} path=${cenv.path} domain=${cenv.domain ?? 'host-only'} secure=${cenv.secure} sameSite=${cenv.sameSite}`,
    );

    res.cookie(cenv.sessionName, tokens.access_token, sessionCookieOptions);

    if (tokens.refresh_token) {
      const refreshCookieOptions = {
        httpOnly: true,
        secure: cenv.secure,
        sameSite: cenv.sameSite,
        domain: cenv.domain,
        path: cenv.refreshPath,
        maxAge: 30 * 24 * 3600 * 1000,
      };

      this.logger.debug(
        `[BFF /callback] Setting refresh cookie with options: ${JSON.stringify(refreshCookieOptions)}`,
      );
      this.logger.debug(
        `[BFF /callback] set-cookie refresh name=${cenv.refreshName} path=${cenv.refreshPath} domain=${cenv.domain ?? 'host-only'} secure=${cenv.secure} sameSite=${cenv.sameSite}`,
      );

      res.cookie(cenv.refreshName, tokens.refresh_token, refreshCookieOptions);
    }
    const ret = req.session.returnTo || '/';
    req.session.returnTo = undefined;
    this.logger.debug(`[BFF /callback] redirect to returnTo=${ret}`);
    return res.redirect(ret);
  }

  // Devuelve claims mínimas
  @Get('me')
  async me(
    @Req() req: Request & { cookies: Record<string, string | undefined> },
    @Res() res: Response,
  ) {
    const cenv = readCookieEnv();
    const cookieKeys = Object.keys(req.cookies || {});

    // Log muy detallado de todas las cookies recibidas
    this.logger.debug(
      `[BFF /me] Raw cookies object: ${JSON.stringify(req.cookies || {}, null, 2)}`,
    );
    this.logger.debug(
      `[BFF /me] Cookies recibidas: [${cookieKeys.join(', ')}], sessionName=${cenv.sessionName}`,
    );
    this.logger.debug(`[BFF /me] Buscando cookie: ${cenv.sessionName}`);
    this.logger.debug(
      `[BFF /me] Headers recibidos: ${JSON.stringify(req.headers.cookie || 'none')}`,
    );

    const tok = req.cookies?.[cenv.sessionName] as string | undefined;
    if (!tok) {
      this.logger.debug('[BFF /me] Cookie de sesión no presente');
      this.logger.debug(
        `[BFF /me] Expected cookie name: ${cenv.sessionName}, Available cookies: ${Object.keys(req.cookies || {}).join(', ')}`,
      );
      return res
        .status(401)
        .send({ error: 'unauthenticated', reason: 'no_cookie' });
    }

    this.logger.debug(
      `[BFF /me] Cookie encontrada, longitud: ${tok.length} caracteres`,
    );

    // valida issuer/audience/firma
    const { issuer, audience } = readAuthEnv();
    const verifyOptions: { issuer?: string; audience?: string } = {
      audience,
    };
    if (issuer) verifyOptions.issuer = issuer;
    this.logger.debug(
      `[BFF /me] Verificando JWT: audience=${audience}, issuer=${issuer ?? 'none'}`,
    );
    let payload: JWTPayload;
    try {
      const verified = await jwtVerify(tok, this.getJWKS(), verifyOptions);
      payload = verified.payload;
    } catch (e) {
      this.logger.debug(
        `[BFF /me] Fallo en verificación JWT: ${e instanceof Error ? e.message : String(e)}`,
      );
      return res
        .status(401)
        .send({ error: 'unauthenticated', reason: 'jwt_verify_failed' });
    }
    const pl = payload as JWTPayload & {
      email?: string;
      realm_access?: { roles?: string[] };
    };
    this.logger.debug(
      `[BFF /me] JWT OK: sub=${payload.sub ?? 'n/a'}, exp=${payload.exp ?? 'n/a'}`,
    );
    return res.send({
      sub: payload.sub,
      email: pl.email,
      roles: pl.realm_access?.roles ?? [],
      // Opcional: informa al cliente del TTL que queda
      session: { exp: payload.exp, iat: payload.iat },
    });
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request & { cookies: Record<string, string | undefined> },
    @Res() res: Response,
  ) {
    const cenv = readCookieEnv();
    const rt = req.cookies?.[cenv.refreshName] as string | undefined;
    if (!rt) return res.status(401).send({ error: 'no_refresh' });
    // (recomendado) valida CSRF header aquí
    const t = await this.oidc.refresh(rt);

    res.cookie(cenv.sessionName, t.access_token, {
      httpOnly: true,
      secure: cenv.secure,
      sameSite: cenv.sameSite,
      domain: cenv.domain,
      path: cenv.path,
      maxAge: (t.expires_in ? t.expires_in : 600) * 1000,
    });
    if (t.refresh_token) {
      res.cookie(cenv.refreshName, t.refresh_token, {
        httpOnly: true,
        secure: cenv.secure,
        sameSite: cenv.sameSite,
        domain: cenv.domain,
        path: cenv.refreshPath,
        maxAge: 30 * 24 * 3600 * 1000,
      });
    }
    return res.sendStatus(204);
  }

  @Post('logout')
  async logout(
    @Req() req: Request & { cookies: Record<string, string | undefined> },
    @Res() res: Response,
  ) {
    const cenv = readCookieEnv();
    const rt = req.cookies?.[cenv.refreshName] as string | undefined;
    if (rt) {
      await this.oidc.revoke(rt);
    }

    res.clearCookie(cenv.sessionName, {
      path: cenv.path,
      domain: cenv.domain,
    });
    res.clearCookie(cenv.refreshName, {
      path: cenv.refreshPath,
      domain: cenv.domain,
    });
    return res.redirect('/api/bff/auth/login');
  }
}
