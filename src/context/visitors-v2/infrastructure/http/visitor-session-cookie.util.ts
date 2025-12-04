// Utilidades centralizadas para las cookies de sesión de Visitor V2
// Mantener lógica aquí evita duplicación en controllers y facilita cambios futuros (nombre, flags, dominio, etc.)
import {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';

export const VISITOR_SESSION_COOKIE = 'sid'; // Cookie segura (httpOnly)
export const VISITOR_SESSION_COOKIE_JS = 'guiders_session_id'; // Cookie accesible desde JavaScript
export const VISITOR_SESSION_COOKIE_X_GUIDERS = 'x-guiders-sid'; // Cookie adicional para frontend

// Deriva opciones de la cookie desde variables de entorno y entorno de ejecución
export function buildVisitorSessionCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const allowDevNone = process.env.ALLOW_DEV_SAMESITE_NONE === 'true';
  const sameSiteEnv = (
    process.env.VISITOR_SESSION_COOKIE_SAMESITE || 'lax'
  ).toLowerCase();
  let sameSite: true | false | 'lax' | 'strict' | 'none' = 'lax';
  if (['lax', 'strict', 'none'].includes(sameSiteEnv)) {
    sameSite = sameSiteEnv as 'lax' | 'strict' | 'none';
  }
  // Evitar SameSite=None sin secure en producción (sería rechazado por navegadores modernos)
  if (!isProd && sameSite === 'none' && !allowDevNone) {
    sameSite = 'lax';
  }
  const domain = process.env.VISITOR_SESSION_COOKIE_DOMAIN || undefined;
  const maxAgeMs = parseInt(
    process.env.VISITOR_SESSION_COOKIE_MAXAGE_MS || '',
    10,
  );
  const maxAge = Number.isFinite(maxAgeMs) ? maxAgeMs : 24 * 60 * 60 * 1000; // por defecto 24h

  return {
    httpOnly: true,
    secure: isProd,
    sameSite,
    maxAge,
    domain,
    path: '/',
  } as const;
}

// Escribe las cookies de sesión (segura y accesibles)
export function setVisitorSessionCookie(
  res: ExpressResponse,
  sessionId: string,
) {
  // Cookie segura con httpOnly para autenticación de backend
  res.cookie(
    VISITOR_SESSION_COOKIE,
    sessionId,
    buildVisitorSessionCookieOptions(),
  );

  // Cookie accesible desde JavaScript para frontend
  const jsAccessibleOptions = {
    ...buildVisitorSessionCookieOptions(),
    httpOnly: false, // Accesible desde JavaScript
  };
  res.cookie(VISITOR_SESSION_COOKIE_JS, sessionId, jsAccessibleOptions);

  // Cookie adicional x-guiders-sid (también accesible desde JavaScript)
  res.cookie(VISITOR_SESSION_COOKIE_X_GUIDERS, sessionId, jsAccessibleOptions);
}

// Limpia todas las cookies de sesión (segura y accesibles)
export function clearVisitorSessionCookie(res: ExpressResponse) {
  const opts = buildVisitorSessionCookieOptions();

  // Limpiar cookie segura (httpOnly)
  res.clearCookie(VISITOR_SESSION_COOKIE, { ...opts, maxAge: 0 });

  // Limpiar cookies accesibles desde JavaScript
  const jsAccessibleOpts = { ...opts, httpOnly: false, maxAge: 0 };
  res.clearCookie(VISITOR_SESSION_COOKIE_JS, jsAccessibleOpts);
  res.clearCookie(VISITOR_SESSION_COOKIE_X_GUIDERS, jsAccessibleOpts);
}

// Extrae el sessionId proporcionado por body, cabeceras HTTP o cookies.
// Orden de prioridad: body > X-Guiders-Sid header > sid cookie > x-guiders-sid cookie > guiders_session_id cookie
export function resolveVisitorSessionId(
  req: ExpressRequest,
  bodySessionId?: string | null,
): string | undefined {
  // 1. Si viene en el body, tiene prioridad máxima
  if (bodySessionId && typeof bodySessionId === 'string') return bodySessionId;

  // 2. Buscar en cabecera HTTP 'X-Guiders-Sid'
  const headerSessionId = req.headers['x-guiders-sid'];
  if (headerSessionId && typeof headerSessionId === 'string') {
    return headerSessionId;
  }

  // 3. Buscar en cookies (múltiples opciones)
  const maybeCookies = (req as unknown as { cookies?: unknown }).cookies;
  if (
    maybeCookies &&
    typeof maybeCookies === 'object' &&
    maybeCookies !== null
  ) {
    const cookies = maybeCookies as Record<string, unknown>;

    // 3a. Buscar en cookie 'sid' (principal, httpOnly)
    if (
      VISITOR_SESSION_COOKIE in cookies &&
      typeof cookies[VISITOR_SESSION_COOKIE] === 'string'
    ) {
      return cookies[VISITOR_SESSION_COOKIE];
    }

    // 3b. Buscar en cookie 'x-guiders-sid' (alternativa)
    if (
      VISITOR_SESSION_COOKIE_X_GUIDERS in cookies &&
      typeof cookies[VISITOR_SESSION_COOKIE_X_GUIDERS] === 'string'
    ) {
      return cookies[VISITOR_SESSION_COOKIE_X_GUIDERS];
    }

    // 3c. Buscar en cookie 'guiders_session_id' (accesible por JS)
    if (
      VISITOR_SESSION_COOKIE_JS in cookies &&
      typeof cookies[VISITOR_SESSION_COOKIE_JS] === 'string'
    ) {
      return cookies[VISITOR_SESSION_COOKIE_JS];
    }
  }

  return undefined;
}
