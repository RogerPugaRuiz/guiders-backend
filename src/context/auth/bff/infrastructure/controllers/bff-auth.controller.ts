// src/context/auth/bff/infrastructure/controllers/bff-auth.controller.ts
import { Controller, Get, Post, Req, Res, Logger, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
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

function readCookieEnv(app?: string) {
  // Nota: en local (HTTP) cookies secure=true no se guardan
  const secure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production';

  // Configuración por aplicación
  let sessionName: string;
  let refreshName: string;

  if (app === 'admin') {
    sessionName = process.env.SESSION_COOKIE_ADMIN || 'admin_session';
    refreshName = process.env.REFRESH_COOKIE_ADMIN || 'admin_refresh';
  } else {
    // Por defecto console
    sessionName =
      process.env.SESSION_COOKIE_CONSOLE ||
      process.env.SESSION_COOKIE ||
      'console_session';
    refreshName =
      process.env.REFRESH_COOKIE_CONSOLE ||
      process.env.REFRESH_COOKIE ||
      'console_refresh';
  }

  const cookieConfig = {
    sessionName,
    refreshName,
    sameSite: parseSameSite(process.env.SAMESITE),
    path: process.env.COOKIE_PATH || '/',
    refreshPath: process.env.REFRESH_PATH || '/api/bff/auth/refresh',
    domain: process.env.COOKIE_DOMAIN || undefined,
    secure,
  } as const;

  // Log detallado de la configuración de cookies
  console.log(`[BFF Cookie Config Debug - ${app || 'default'}]`, {
    app: app || 'console',
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
    audience: process.env.KEYCLOAK_AUDIENCE || 'account',
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

@ApiTags('BFF Auth')
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

  @ApiOperation({
    summary: 'Iniciar login OIDC (console)',
    description:
      'Inicia el flujo OIDC con PKCE. Guarda returnTo en sesión y redirige al proveedor OIDC. Uso por defecto para la app console.',
  })
  @ApiQuery({
    name: 'redirect',
    required: false,
    description:
      'URL a la que volver tras autenticación. Validada contra ALLOW_RETURN_TO.',
  })
  @ApiResponse({ status: 302, description: 'Redirección a proveedor OIDC' })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
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

  @ApiOperation({
    summary: 'Iniciar login OIDC para app',
    description:
      'Inicia el flujo OIDC para una app específica (console|admin). Guarda returnTo y redirige al proveedor OIDC.',
  })
  @ApiParam({ name: 'app', enum: ['console', 'admin'] })
  @ApiQuery({
    name: 'redirect',
    required: false,
    description:
      'URL a la que volver tras autenticación. Validada contra ALLOW_RETURN_TO.',
  })
  @ApiResponse({ status: 302, description: 'Redirección a proveedor OIDC' })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
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

  @ApiOperation({
    summary: 'Callback OIDC',
    description:
      'Procesa el callback OIDC, emite cookies HttpOnly (session/refresh) y redirige a returnTo. Si hay error de sesión, reintenta login.',
  })
  @ApiParam({ name: 'app', enum: ['console', 'admin'] })
  @ApiResponse({
    status: 302,
    description: 'Redirección a returnTo tras login',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirección a login en caso de error',
  })
  @ApiResponse({ status: 400, description: 'Callback inválido' })
  @Get('callback/:app')
  async callback(
    @Param('app') app: string,
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
        `[BFF /callback/${app}] sessionKeys=[${sessKeys.join(', ')}] queryKeys=[${queryKeys.join(', ')}]`,
      );
      tokens = await this.oidc.handleCallback(req.query, req.session, {
        app,
      });
    } catch (e) {
      // Si falta la sesión PKCE/state/nonce o hay cualquier error, reintenta login limpio
      const reason =
        e instanceof Error && /session|state|nonce/i.test(e.message)
          ? 'session_mismatch'
          : 'callback_error';
      return res.redirect(`/api/bff/auth/login/${app}?reason=${reason}`);
    }

    // Cookies HttpOnly - usando configuración específica por app
    const cenv = readCookieEnv(app);
    this.logger.debug(
      `[BFF /callback/${app}] tokens: access=present refresh=${tokens.refresh_token ? 'present' : 'none'} exp_in=${tokens.expires_in ?? 'n/a'}`,
    );

    // Log detallado de la configuración de cookies antes de establecerlas
    this.logger.debug(
      `[BFF /callback/${app}] Cookie Config Debug: ${JSON.stringify({
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
      `[BFF /callback/${app}] Setting session cookie with options: ${JSON.stringify(sessionCookieOptions)}`,
    );
    this.logger.debug(
      `[BFF /callback/${app}] set-cookie session name=${cenv.sessionName} path=${cenv.path} domain=${cenv.domain ?? 'host-only'} secure=${cenv.secure} sameSite=${cenv.sameSite}`,
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
        `[BFF /callback/${app}] Setting refresh cookie with options: ${JSON.stringify(refreshCookieOptions)}`,
      );
      this.logger.debug(
        `[BFF /callback/${app}] set-cookie refresh name=${cenv.refreshName} path=${cenv.refreshPath} domain=${cenv.domain ?? 'host-only'} secure=${cenv.secure} sameSite=${cenv.sameSite}`,
      );

      res.cookie(cenv.refreshName, tokens.refresh_token, refreshCookieOptions);
    }
    const ret = req.session.returnTo || '/';
    req.session.returnTo = undefined;
    this.logger.debug(`[BFF /callback/${app}] redirect to returnTo=${ret}`);
    return res.redirect(ret);
  }

  // Devuelve claims mínimas
  @ApiOperation({
    summary: 'Obtener claims del usuario (console)',
    description:
      'Devuelve claims básicos del usuario autenticado a partir de la cookie de sesión HttpOnly. Requiere cookie válida.',
  })
  @ApiResponse({ status: 200, description: 'Claims del usuario' })
  @ApiResponse({ status: 401, description: 'No autenticado o JWT inválido' })
  @ApiResponse({ status: 400, description: 'Solicitud inválida' })
  @Get('me')
  async me(
    @Req() req: Request & { cookies: Record<string, string | undefined> },
    @Res() res: Response,
  ) {
    return this.getMeForApp(req, res, 'console'); // Por defecto console
  }

  @ApiOperation({
    summary: 'Obtener claims del usuario (app)',
    description:
      'Devuelve claims básicos del usuario autenticado para la app indicada (console|admin). Requiere cookie válida.',
  })
  @ApiParam({ name: 'app', enum: ['console', 'admin'] })
  @ApiResponse({ status: 200, description: 'Claims del usuario' })
  @ApiResponse({ status: 401, description: 'No autenticado o JWT inválido' })
  @ApiResponse({ status: 400, description: 'Solicitud inválida' })
  @Get('me/:app')
  async meForApp(
    @Param('app') app: string,
    @Req() req: Request & { cookies: Record<string, string | undefined> },
    @Res() res: Response,
  ) {
    return this.getMeForApp(req, res, app);
  }

  private async getMeForApp(
    req: Request & { cookies: Record<string, string | undefined> },
    res: Response,
    app: string,
  ) {
    const cenv = readCookieEnv(app);
    const cookieKeys = Object.keys(req.cookies || {});

    // Log muy detallado de todas las cookies recibidas
    this.logger.debug(
      `[BFF /me/${app}] Raw cookies object: ${JSON.stringify(req.cookies || {}, null, 2)}`,
    );
    this.logger.debug(
      `[BFF /me/${app}] Cookies recibidas: [${cookieKeys.join(', ')}], sessionName=${cenv.sessionName}`,
    );
    this.logger.debug(`[BFF /me/${app}] Buscando cookie: ${cenv.sessionName}`);
    this.logger.debug(
      `[BFF /me/${app}] Headers recibidos: ${JSON.stringify(req.headers.cookie || 'none')}`,
    );

    const tok = req.cookies?.[cenv.sessionName] as string | undefined;
    if (!tok) {
      this.logger.debug(`[BFF /me/${app}] Cookie de sesión no presente`);
      this.logger.debug(
        `[BFF /me/${app}] Expected cookie name: ${cenv.sessionName}, Available cookies: ${Object.keys(req.cookies || {}).join(', ')}`,
      );
      return res
        .status(401)
        .send({ error: 'unauthenticated', reason: 'no_cookie' });
    }

    this.logger.debug(
      `[BFF /me/${app}] Cookie encontrada, longitud: ${tok.length} caracteres`,
    );

    // valida issuer/audience/firma
    const { issuer, audience } = readAuthEnv();
    const verifyOptions: { issuer?: string; audience?: string } = {
      audience,
    };
    if (issuer) verifyOptions.issuer = issuer;
    this.logger.debug(
      `[BFF /me/${app}] Verificando JWT: audience=${audience}, issuer=${issuer ?? 'none'}`,
    );
    let payload: JWTPayload;
    try {
      const verified = await jwtVerify(tok, this.getJWKS(), verifyOptions);
      payload = verified.payload;
    } catch (e) {
      this.logger.debug(
        `[BFF /me/${app}] Fallo en verificación JWT: ${e instanceof Error ? e.message : String(e)}`,
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
      `[BFF /me/${app}] JWT OK: sub=${payload.sub ?? 'n/a'}, exp=${payload.exp ?? 'n/a'}`,
    );
    return res.send({
      sub: payload.sub,
      email: pl.email,
      roles: pl.realm_access?.roles ?? [],
      app: app, // Incluir información de la app
      // Opcional: informa al cliente del TTL que queda
      session: { exp: payload.exp, iat: payload.iat },
    });
  }

  @ApiOperation({
    summary: 'Refrescar sesión (console)',
    description:
      'Renueva la cookie de sesión usando el refresh token HttpOnly. Responde 204 sin contenido si OK.',
  })
  @ApiResponse({ status: 204, description: 'Sesión renovada' })
  @ApiResponse({ status: 401, description: 'Refresh token ausente o inválido' })
  @ApiResponse({ status: 400, description: 'Solicitud inválida' })
  @Post('refresh')
  async refresh(
    @Req() req: Request & { cookies: Record<string, string | undefined> },
    @Res() res: Response,
  ) {
    return this.doRefresh(req, res, 'console'); // Por defecto console
  }

  @ApiOperation({
    summary: 'Refrescar sesión (app)',
    description:
      'Renueva la cookie de sesión para la app indicada (console|admin) usando el refresh token HttpOnly. Responde 204 si OK.',
  })
  @ApiParam({ name: 'app', enum: ['console', 'admin'] })
  @ApiResponse({ status: 204, description: 'Sesión renovada' })
  @ApiResponse({ status: 401, description: 'Refresh token ausente o inválido' })
  @ApiResponse({ status: 400, description: 'Solicitud inválida' })
  @Post('refresh/:app')
  async refreshForApp(
    @Param('app') app: string,
    @Req() req: Request & { cookies: Record<string, string | undefined> },
    @Res() res: Response,
  ) {
    return this.doRefresh(req, res, app);
  }

  private async doRefresh(
    req: Request & { cookies: Record<string, string | undefined> },
    res: Response,
    app: string,
  ) {
    const cenv = readCookieEnv(app);
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

  @ApiOperation({
    summary: 'Cerrar sesión (console)',
    description:
      'Revoca refresh token si existe, limpia cookies y redirige a /api/bff/auth/login/console.',
  })
  @ApiResponse({ status: 302, description: 'Redirige a /login/console' })
  @ApiResponse({ status: 400, description: 'Solicitud inválida' })
  @Post('logout')
  async logout(
    @Req() req: Request & { cookies: Record<string, string | undefined> },
    @Res() res: Response,
  ) {
    return this.doLogout(req, res, 'console'); // Por defecto console
  }

  @ApiOperation({
    summary: 'Cerrar sesión (app)',
    description:
      'Revoca refresh token si existe, limpia cookies y redirige a /api/bff/auth/login/:app.',
  })
  @ApiParam({ name: 'app', enum: ['console', 'admin'] })
  @ApiResponse({ status: 302, description: 'Redirige a /login/:app' })
  @ApiResponse({ status: 400, description: 'Solicitud inválida' })
  @Post('logout/:app')
  async logoutForApp(
    @Param('app') app: string,
    @Req() req: Request & { cookies: Record<string, string | undefined> },
    @Res() res: Response,
  ) {
    return this.doLogout(req, res, app);
  }

  private async doLogout(
    req: Request & { cookies: Record<string, string | undefined> },
    res: Response,
    app: string,
  ) {
    const cenv = readCookieEnv(app);
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
    return res.redirect(`/api/bff/auth/login/${app}`);
  }
}
