import { DomainError } from 'src/context/shared/domain/domain.error';

/**
 * Error de dominio cuando se intenta liberar un claim que ya está liberado
 */
export class ClaimAlreadyReleasedError extends DomainError {
  constructor(claimId: string) {
    super(`El claim ${claimId} ya ha sido liberado previamente`);
  }
}
