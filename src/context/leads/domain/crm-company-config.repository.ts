import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  CrmType,
  CrmCompanyConfigPrimitives,
} from './services/crm-sync.service';

/**
 * Interface del repositorio de configuración de CRM por empresa
 */
export interface ICrmCompanyConfigRepository {
  /**
   * Guarda una nueva configuración
   */
  save(config: CrmCompanyConfigPrimitives): Promise<Result<void, DomainError>>;

  /**
   * Busca configuración por empresa y tipo de CRM
   */
  findByCompanyAndType(
    companyId: string,
    crmType: CrmType,
  ): Promise<Result<CrmCompanyConfigPrimitives | null, DomainError>>;

  /**
   * Busca configuración por ID
   */
  findById(
    id: string,
  ): Promise<Result<CrmCompanyConfigPrimitives | null, DomainError>>;

  /**
   * Busca todas las configuraciones de una empresa
   */
  findByCompanyId(
    companyId: string,
  ): Promise<Result<CrmCompanyConfigPrimitives[], DomainError>>;

  /**
   * Busca todas las configuraciones habilitadas de una empresa
   */
  findEnabledByCompanyId(
    companyId: string,
  ): Promise<Result<CrmCompanyConfigPrimitives[], DomainError>>;

  /**
   * Actualiza una configuración existente
   */
  update(
    config: CrmCompanyConfigPrimitives,
  ): Promise<Result<void, DomainError>>;

  /**
   * Elimina una configuración por ID
   */
  delete(id: string): Promise<Result<void, DomainError>>;

  /**
   * Elimina una configuración por companyId y crmType
   */
  deleteByCompanyAndType(
    companyId: string,
    crmType: CrmType,
  ): Promise<Result<void, DomainError>>;

  /**
   * Verifica si existe configuración para una empresa y tipo de CRM
   */
  exists(
    companyId: string,
    crmType: CrmType,
  ): Promise<Result<boolean, DomainError>>;

  /**
   * Busca todas las empresas con integración habilitada para un tipo de CRM
   */
  findCompaniesWithEnabledCrm(
    crmType: CrmType,
  ): Promise<Result<CrmCompanyConfigPrimitives[], DomainError>>;
}

/**
 * Symbol para inyección de dependencias
 */
export const CRM_COMPANY_CONFIG_REPOSITORY = Symbol(
  'ICrmCompanyConfigRepository',
);
