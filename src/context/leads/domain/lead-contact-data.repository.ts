import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { LeadContactDataPrimitives } from './services/crm-sync.service';

/**
 * Interface del repositorio de datos de contacto de leads
 */
export interface ILeadContactDataRepository {
  /**
   * Guarda o actualiza datos de contacto
   */
  save(data: LeadContactDataPrimitives): Promise<Result<void, DomainError>>;

  /**
   * Busca datos de contacto por visitor ID
   */
  findByVisitorId(
    visitorId: string,
    companyId: string,
  ): Promise<Result<LeadContactDataPrimitives | null, DomainError>>;

  /**
   * Busca datos de contacto por ID
   */
  findById(
    id: string,
  ): Promise<Result<LeadContactDataPrimitives | null, DomainError>>;

  /**
   * Busca todos los datos de contacto de una empresa
   */
  findByCompanyId(
    companyId: string,
  ): Promise<Result<LeadContactDataPrimitives[], DomainError>>;

  /**
   * Actualiza datos de contacto existentes
   */
  update(data: LeadContactDataPrimitives): Promise<Result<void, DomainError>>;

  /**
   * Elimina datos de contacto
   */
  delete(
    visitorId: string,
    companyId: string,
  ): Promise<Result<void, DomainError>>;

  /**
   * Busca datos de contacto por email
   */
  findByEmail(
    email: string,
    companyId: string,
  ): Promise<Result<LeadContactDataPrimitives | null, DomainError>>;

  /**
   * Verifica si existen datos de contacto para un visitor
   */
  exists(
    visitorId: string,
    companyId: string,
  ): Promise<Result<boolean, DomainError>>;

  /**
   * Busca datos de contacto extraídos de un chat específico
   */
  findByChatId(
    chatId: string,
    companyId: string,
  ): Promise<Result<LeadContactDataPrimitives[], DomainError>>;
}

/**
 * Symbol para inyección de dependencias
 */
export const LEAD_CONTACT_DATA_REPOSITORY = Symbol(
  'ILeadContactDataRepository',
);
