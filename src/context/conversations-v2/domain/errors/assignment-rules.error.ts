import { DomainError } from 'src/context/shared/domain/domain.error';

/**
 * Error específico para operaciones con reglas de asignamiento
 */
export class AssignmentRulesError extends DomainError {
  constructor(message: string) {
    super(`Error en reglas de asignamiento: ${message}`);
  }
}

/**
 * Error para cuando no se encuentran reglas de asignamiento
 */
export class AssignmentRulesNotFoundError extends DomainError {
  constructor(companyId: string, siteId?: string) {
    super(
      `No se encontraron reglas de asignamiento para empresa ${companyId}${
        siteId ? ` y sitio ${siteId}` : ''
      }`,
    );
  }
}

/**
 * Error para cuando las reglas de asignamiento son inválidas
 */
export class InvalidAssignmentRulesError extends DomainError {
  constructor(message: string) {
    super(`Reglas de asignamiento inválidas: ${message}`);
  }
}
