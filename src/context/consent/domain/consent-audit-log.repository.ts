import { Result } from '../../shared/domain/result';
import { ConsentPersistenceError } from './errors/consent.error';
import { ConsentAuditLog } from './consent-audit-log.aggregate';
import { VisitorId } from '../../visitors-v2/domain/value-objects/visitor-id';
import { ConsentId } from './value-objects/consent-id';

/**
 * Interfaz del repositorio de audit logs de consentimientos
 * Define el contrato para la persistencia de registros de auditoría
 *
 * GDPR Art. 30: Los registros deben conservarse y estar disponibles
 */
export interface ConsentAuditLogRepository {
  /**
   * Guarda un registro de auditoría
   * Los audit logs son inmutables (write-only)
   */
  save(
    auditLog: ConsentAuditLog,
  ): Promise<Result<void, ConsentPersistenceError>>;

  /**
   * Busca todos los audit logs de un visitante específico
   * Ordenados por timestamp descendente (más recientes primero)
   */
  findByVisitorId(
    visitorId: VisitorId,
  ): Promise<Result<ConsentAuditLog[], ConsentPersistenceError>>;

  /**
   * Busca todos los audit logs de un consentimiento específico
   * Útil para ver la trazabilidad completa de un consentimiento
   */
  findByConsentId(
    consentId: ConsentId,
  ): Promise<Result<ConsentAuditLog[], ConsentPersistenceError>>;

  /**
   * Busca audit logs en un rango de fechas
   * Útil para reportes de cumplimiento GDPR
   */
  findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Result<ConsentAuditLog[], ConsentPersistenceError>>;

  /**
   * Cuenta el número total de audit logs para un visitante
   */
  countByVisitorId(
    visitorId: VisitorId,
  ): Promise<Result<number, ConsentPersistenceError>>;
}

/**
 * Token de inyección de dependencias para el repositorio
 */
export const CONSENT_AUDIT_LOG_REPOSITORY = Symbol('ConsentAuditLogRepository');
