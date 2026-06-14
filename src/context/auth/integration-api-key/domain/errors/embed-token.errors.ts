import { DomainError } from 'src/context/shared/domain/domain.error';

/**
 * Error devuelto cuando un embed token no se encuentra en Redis
 * (expirado, revocado, o nunca emitido).
 */
export class EmbedTokenNotFoundError extends DomainError {
  constructor(tokenPrefix: string) {
    super(`Embed token no encontrado o expirado: ${tokenPrefix}`);
  }
}

/**
 * Error devuelto cuando el input del token no es un base64url válido
 * (longitud != 43 o charset incorrecto). NO es un "no encontrado"
 * legítimo: el caller envió basura.
 */
export class EmbedTokenInvalidFormatError extends DomainError {
  constructor() {
    super('Embed token con formato inválido (debe ser base64url de 43 chars)');
  }
}

/**
 * Error devuelto cuando el VALUE en Redis existe pero no es un
 * EmbedTokenData válido (JSON corrupto, campos faltantes, tipos
 * incorrectos). Indice de corrupción o bug de serialización.
 */
export class EmbedTokenCorruptedError extends DomainError {
  constructor() {
    super('Embed token corrupto (JSON no conforme al esquema esperado)');
  }
}

/**
 * Error genérico del EmbedTokenService (problemas de Redis,
 * JSON malformado, etc.).
 */
export class EmbedTokenError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Códigos de error del endpoint `/v2/integration/embed/start`.
 * Se exponen al cliente para distinguir 403/401 sin leak de info.
 */
export type EmbedTokenForbiddenCode =
  | 'EMBED_DISABLED_FOR_TENANT'
  | 'EMBED_USER_NOT_IN_TENANT'
  | 'EMBED_TENANT_MISMATCH';

/**
 * Error devuelto por el command handler de embed cuando una validación
 * de seguridad falla. Se traduce a HTTP 403 con `code` en el body.
 */
export class EmbedTokenForbiddenError extends DomainError {
  constructor(
    public readonly code: EmbedTokenForbiddenCode,
    customMessage?: string,
  ) {
    super(customMessage ?? `Embed token forbidden: ${code}`);
  }
}
