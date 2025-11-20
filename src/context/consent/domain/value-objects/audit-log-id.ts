import { Uuid } from '../../../shared/domain/value-objects/uuid';

/**
 * Value Object para el identificador de un audit log
 */
export class AuditLogId extends Uuid {
  static random(): AuditLogId {
    return new AuditLogId(Uuid.random().value);
  }
}
