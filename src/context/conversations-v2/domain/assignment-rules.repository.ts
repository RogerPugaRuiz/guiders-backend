import { AssignmentRules } from './value-objects/assignment-rules';
import { Result } from 'src/context/shared/domain/result';
import { AssignmentRulesError } from './errors/assignment-rules.error';

/**
 * Filtros para buscar reglas de asignamiento
 */
export interface AssignmentRulesFilters {
  companyId?: string;
  siteId?: string;
  isActive?: boolean;
  strategy?: string;
}

/**
 * Repositorio para reglas de auto-asignación
 */
export interface IAssignmentRulesRepository {
  /**
   * Guarda reglas de asignamiento
   */
  save(rules: AssignmentRules): Promise<Result<void, AssignmentRulesError>>;

  /**
   * Busca reglas por empresa y sitio
   */
  findByCompanyAndSite(
    companyId: string,
    siteId?: string,
  ): Promise<Result<AssignmentRules | null, AssignmentRulesError>>;

  /**
   * Busca todas las reglas que coincidan con los filtros
   */
  findByFilters(
    filters: AssignmentRulesFilters,
  ): Promise<Result<AssignmentRules[], AssignmentRulesError>>;

  /**
   * Actualiza reglas existentes
   */
  update(rules: AssignmentRules): Promise<Result<void, AssignmentRulesError>>;

  /**
   * Elimina reglas por empresa y sitio
   */
  delete(
    companyId: string,
    siteId?: string,
  ): Promise<Result<void, AssignmentRulesError>>;

  /**
   * Busca las reglas más específicas aplicables a una empresa/sitio
   * Prioriza: sitio específico > reglas de empresa > reglas por defecto
   */
  findApplicableRules(
    companyId: string,
    siteId?: string,
  ): Promise<Result<AssignmentRules | null, AssignmentRulesError>>;
}

/**
 * Símbolo de inyección de dependencias
 */
export const ASSIGNMENT_RULES_REPOSITORY = Symbol('AssignmentRulesRepository');
