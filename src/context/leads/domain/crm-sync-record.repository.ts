import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { CrmType } from './services/crm-sync.service';

/**
 * Estado de sincronización con CRM
 */
export type CrmSyncStatus = 'pending' | 'synced' | 'failed' | 'partial';

/**
 * Primitivos del registro de sincronización con CRM
 */
export interface CrmSyncRecordPrimitives {
  id: string;
  visitorId: string;
  companyId: string;
  crmType: CrmType;
  externalLeadId?: string;
  status: CrmSyncStatus;
  lastSyncAt?: Date;
  lastError?: string;
  retryCount: number;
  chatsSynced: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface del repositorio de registros de sincronización con CRM
 */
export interface ICrmSyncRecordRepository {
  /**
   * Guarda un nuevo registro de sincronización
   */
  save(record: CrmSyncRecordPrimitives): Promise<Result<void, DomainError>>;

  /**
   * Busca un registro por visitor ID y tipo de CRM
   */
  findByVisitorId(
    visitorId: string,
    companyId: string,
    crmType?: CrmType,
  ): Promise<Result<CrmSyncRecordPrimitives | null, DomainError>>;

  /**
   * Busca un registro por ID
   */
  findById(
    id: string,
  ): Promise<Result<CrmSyncRecordPrimitives | null, DomainError>>;

  /**
   * Actualiza un registro existente
   */
  update(record: CrmSyncRecordPrimitives): Promise<Result<void, DomainError>>;

  /**
   * Busca registros pendientes de sincronización
   */
  findPending(
    companyId: string,
    crmType?: CrmType,
  ): Promise<Result<CrmSyncRecordPrimitives[], DomainError>>;

  /**
   * Busca registros fallidos para reintentar
   */
  findFailedForRetry(
    companyId: string,
    maxRetries: number,
    crmType?: CrmType,
  ): Promise<Result<CrmSyncRecordPrimitives[], DomainError>>;

  /**
   * Marca un chat como sincronizado
   */
  markChatSynced(
    visitorId: string,
    companyId: string,
    crmType: CrmType,
    chatId: string,
  ): Promise<Result<void, DomainError>>;

  /**
   * Verifica si un chat ya está sincronizado
   */
  isChatSynced(
    visitorId: string,
    companyId: string,
    crmType: CrmType,
    chatId: string,
  ): Promise<Result<boolean, DomainError>>;

  /**
   * Busca por ID externo del lead en el CRM
   */
  findByExternalLeadId(
    externalLeadId: string,
    companyId: string,
    crmType: CrmType,
  ): Promise<Result<CrmSyncRecordPrimitives | null, DomainError>>;

  /**
   * Cuenta registros por estado
   */
  countByStatus(
    companyId: string,
    status: CrmSyncStatus,
    crmType?: CrmType,
  ): Promise<Result<number, DomainError>>;

  /**
   * Busca todos los registros de una empresa
   */
  findByCompanyId(
    companyId: string,
  ): Promise<Result<CrmSyncRecordPrimitives[], DomainError>>;

  /**
   * Busca registros fallidos de una empresa
   */
  findFailedByCompanyId(
    companyId: string,
  ): Promise<Result<CrmSyncRecordPrimitives[], DomainError>>;
}

/**
 * Symbol para inyección de dependencias
 */
export const CRM_SYNC_RECORD_REPOSITORY = Symbol('ICrmSyncRecordRepository');
