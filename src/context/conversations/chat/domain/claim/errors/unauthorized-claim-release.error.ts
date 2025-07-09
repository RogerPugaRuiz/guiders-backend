import { DomainError } from 'src/context/shared/domain/domain.error';

/**
 * Error de dominio cuando un comercial intenta liberar un claim que no le pertenece
 */
export class UnauthorizedClaimReleaseError extends DomainError {
  constructor(comercialId: string, claimId: string) {
    super(
      `El comercial ${comercialId} no está autorizado para liberar el claim ${claimId}`,
    );
  }
}
