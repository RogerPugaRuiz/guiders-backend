import { ConsentAuditLog } from '../../../domain/consent-audit-log.aggregate';
import { ConsentAuditLogMongoEntity } from '../entity/consent-audit-log-mongo.entity';

/**
 * Mapper para convertir entre el agregado ConsentAuditLog y la entidad MongoDB
 */
export class ConsentAuditLogMapper {
  /**
   * Convierte el agregado de dominio a entidad de persistencia
   */
  static toPersistence(
    auditLog: ConsentAuditLog,
  ): Partial<ConsentAuditLogMongoEntity> {
    const primitives = auditLog.toPrimitives();

    return {
      id: primitives.id,
      consentId: primitives.consentId,
      visitorId: primitives.visitorId,
      actionType: primitives.actionType,
      consentType: primitives.consentType,
      consentVersion: primitives.consentVersion,
      ipAddress: primitives.ipAddress,
      userAgent: primitives.userAgent,
      reason: primitives.reason,
      metadata: primitives.metadata,
      timestamp: new Date(primitives.timestamp),
    };
  }

  /**
   * Convierte la entidad de persistencia al agregado de dominio
   */
  static toDomain(entity: ConsentAuditLogMongoEntity): ConsentAuditLog {
    return ConsentAuditLog.fromPrimitives({
      id: entity.id,
      consentId: entity.consentId,
      visitorId: entity.visitorId,
      actionType: entity.actionType,
      consentType: entity.consentType,
      consentVersion: entity.consentVersion,
      ipAddress: entity.ipAddress,
      userAgent: entity.userAgent,
      reason: entity.reason,
      metadata: entity.metadata,
      timestamp: entity.timestamp.toISOString(),
    });
  }
}
