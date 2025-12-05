// Utilidades centralizadas para las cookies de sesión de Visitor V2
// Mantener lógica aquí evita duplicación en controllers y facilita cambios futuros (nombre, flags, dominio, etc.)
import {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';

export const VISITOR_SESSION_COOKIE = 'x-guiders-sid'; // Cookie única para visitantes (accesible desde JavaScript para cross-domain)

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
    httpOnly: false, // Accesible desde JavaScript para soporte cross-domain
    secure: isProd,
    sameSite,
    maxAge,
    domain,
    path: '/',
  } as const;
}

// Escribe la cookie de sesión de visitante
export function setVisitorSessionCookie(
  res: ExpressResponse,
  sessionId: string,
) {
  res.cookie(
    VISITOR_SESSION_COOKIE,
    sessionId,
    buildVisitorSessionCookieOptions(),
  );
}

// Limpia la cookie de sesión de visitante
export function clearVisitorSessionCookie(res: ExpressResponse) {
  const opts = buildVisitorSessionCookieOptions();
  res.clearCookie(VISITOR_SESSION_COOKIE, { ...opts, maxAge: 0 });
}

// Extrae el sessionId proporcionado por body, cabeceras HTTP o cookie.
// Orden de prioridad: body > X-Guiders-Sid header > x-guiders-sid cookie
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

  // 3. Buscar en cookie 'x-guiders-sid'
  const maybeCookies = (req as unknown as { cookies?: unknown }).cookies;
  if (
    maybeCookies &&
    typeof maybeCookies === 'object' &&
    maybeCookies !== null
  ) {
    const cookies = maybeCookies as Record<string, unknown>;

    if (
      VISITOR_SESSION_COOKIE in cookies &&
      typeof cookies[VISITOR_SESSION_COOKIE] === 'string'
    ) {
      return cookies[VISITOR_SESSION_COOKIE];
    }
  }

  return undefined;
}
