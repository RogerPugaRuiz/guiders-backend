// Utilidades centralizadas para la cookie de sesión de Visitor V2
// Mantener lógica aquí evita duplicación en controllers y facilita cambios futuros (nombre, flags, dominio, etc.)
import {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';

export const VISITOR_SESSION_COOKIE = 'sid';

// Deriva opciones de la cookie desde variables de entorno y entorno de ejecución
export function buildVisitorSessionCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSiteEnv = (
    process.env.VISITOR_SESSION_COOKIE_SAMESITE || 'lax'
  ).toLowerCase();
  let sameSite: true | false | 'lax' | 'strict' | 'none' = 'lax';
  if (['lax', 'strict', 'none'].includes(sameSiteEnv)) {
    sameSite = sameSiteEnv as 'lax' | 'strict' | 'none';
  }
  // Evitar SameSite=None sin secure en producción (sería rechazado por navegadores modernos)
  if (!isProd && sameSite === 'none') {
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

// Escribe la cookie de sesión
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

// Limpia la cookie de sesión (usando mismas opciones base para asegurar eliminación consistente)
export function clearVisitorSessionCookie(res: ExpressResponse) {
  const opts = buildVisitorSessionCookieOptions();
  res.clearCookie(VISITOR_SESSION_COOKIE, { ...opts, maxAge: 0 });
}

// Extrae el sessionId proporcionado por body o desde la cookie. Body prevalece.
export function resolveVisitorSessionId(
  req: ExpressRequest,
  bodySessionId?: string | null,
): string | undefined {
  if (bodySessionId && typeof bodySessionId === 'string') return bodySessionId;
  const maybeCookies = (req as unknown as { cookies?: unknown }).cookies;
  if (
    maybeCookies &&
    typeof maybeCookies === 'object' &&
    maybeCookies !== null &&
    VISITOR_SESSION_COOKIE in maybeCookies &&
    typeof (maybeCookies as Record<string, unknown>)[VISITOR_SESSION_COOKIE] ===
      'string'
  ) {
    return (maybeCookies as Record<string, string>)[VISITOR_SESSION_COOKIE];
  }
  return undefined;
}
