import { VisitorV2 } from './visitor-v2.aggregate';
import { VisitorId } from './value-objects/visitor-id';
import { DomainId } from './value-objects/domain-id';
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
   * Busca un visitante por su fingerprint y domainId
   */
  findByFingerprintAndDomain(
    fingerprint: string,
    domainId: DomainId,
  ): Promise<Result<VisitorV2, DomainError>>;

  /**
   * Busca todos los visitantes de un dominio
   */
  findByDomain(domainId: DomainId): Promise<Result<VisitorV2[], DomainError>>;

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
}
