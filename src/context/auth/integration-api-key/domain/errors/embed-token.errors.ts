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
 * Error genérico del EmbedTokenService (problemas de Redis,
 * JSON malformado, etc.).
 */
export class EmbedTokenError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
