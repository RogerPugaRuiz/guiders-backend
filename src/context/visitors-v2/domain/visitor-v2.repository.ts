import { VisitorV2 } from './visitor-v2.aggregate';
import { VisitorId } from './value-objects/visitor-id';
import { SiteId } from './value-objects/site-id';
import { TenantId } from './value-objects/tenant-id';
import { VisitorFingerprint } from './value-objects/visitor-fingerprint';
import { SessionId } from './value-objects/session-id';
import { Result } from '../../shared/domain/result';
import { DomainError } from '../../shared/domain/domain.error';

export const VISITOR_V2_REPOSITORY = Symbol('VisitorV2Repository');

/**
 * Repositorio de dominio para VisitorV2
 * Define los métodos principales del repositorio de visitantes V2
 */
export interface VisitorV2Repository {
  /**
   * Guarda un visitante en el repositorio
   */
  save(visitor: VisitorV2): Promise<Result<void, DomainError>>;

  /**
   * Busca un visitante por su ID
   */
  findById(id: VisitorId): Promise<Result<VisitorV2, DomainError>>;

  /**
   * Busca un visitante por su fingerprint y siteId
   */
  findByFingerprintAndSite(
    fingerprint: VisitorFingerprint,
    siteId: SiteId,
  ): Promise<Result<VisitorV2, DomainError>>;

  /**
   * Busca un visitante por sessionId
   */
  findBySessionId(
    sessionId: SessionId,
  ): Promise<Result<VisitorV2, DomainError>>;

  /**
   * Busca todos los visitantes de un sitio
   */
  findBySiteId(siteId: SiteId): Promise<Result<VisitorV2[], DomainError>>;

  /**
   * Busca todos los visitantes de un tenant
   */
  findByTenantId(tenantId: TenantId): Promise<Result<VisitorV2[], DomainError>>;

  /**
   * Elimina un visitante por su ID
   */
  delete(id: VisitorId): Promise<Result<void, DomainError>>;

  /**
   * Busca todos los visitantes
   */
  findAll(): Promise<Result<VisitorV2[], DomainError>>;

  /**
   * Actualiza un visitante existente
   */
  update(visitor: VisitorV2): Promise<Result<void, DomainError>>;

  /**
   * Busca visitantes que tienen sesiones activas (sin endedAt)
   */
  findWithActiveSessions(options?: {
    tenantId?: TenantId;
    limit?: number;
  }): Promise<Result<VisitorV2[], DomainError>>;
}
