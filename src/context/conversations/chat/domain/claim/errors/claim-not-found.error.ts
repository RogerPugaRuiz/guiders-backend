import { DomainError } from 'src/context/shared/domain/domain.error';

/**
 * Error de dominio cuando no se encuentra un claim
 */
export class ClaimNotFoundError extends DomainError {
  constructor(chatId: string) {
    super(`No se encontró un claim activo para el chat ${chatId}`);
  }
}
