import { PrimitiveValueObject } from '../../../shared/domain/primitive-value-object';

/**
 * Value Object para el tipo de acción en el audit log
 * GDPR Art. 5.2: Registro de actividades de tratamiento
 */
export class AuditActionType extends PrimitiveValueObject<string> {
  static readonly CONSENT_GRANTED = 'consent_granted';
  static readonly CONSENT_DENIED = 'consent_denied';
  static readonly CONSENT_REVOKED = 'consent_revoked';
  static readonly CONSENT_EXPIRED = 'consent_expired';
  static readonly CONSENT_RENEWED = 'consent_renewed';

  private static readonly VALID_ACTIONS = [
    AuditActionType.CONSENT_GRANTED,
    AuditActionType.CONSENT_DENIED,
    AuditActionType.CONSENT_REVOKED,
    AuditActionType.CONSENT_EXPIRED,
    AuditActionType.CONSENT_RENEWED,
  ];

  constructor(value: string) {
    super(
      value,
      (v: string) => AuditActionType.VALID_ACTIONS.includes(v),
      `Tipo de acción inválido: ${value}. Tipos válidos: ${AuditActionType.VALID_ACTIONS.join(', ')}`,
    );
  }

  static granted(): AuditActionType {
    return new AuditActionType(AuditActionType.CONSENT_GRANTED);
  }

  static denied(): AuditActionType {
    return new AuditActionType(AuditActionType.CONSENT_DENIED);
  }

  static revoked(): AuditActionType {
    return new AuditActionType(AuditActionType.CONSENT_REVOKED);
  }

  static expired(): AuditActionType {
    return new AuditActionType(AuditActionType.CONSENT_EXPIRED);
  }

  static renewed(): AuditActionType {
    return new AuditActionType(AuditActionType.CONSENT_RENEWED);
  }

  isGranted(): boolean {
    return this.getValue() === AuditActionType.CONSENT_GRANTED;
  }

  isDenied(): boolean {
    return this.getValue() === AuditActionType.CONSENT_DENIED;
  }

  isRevoked(): boolean {
    return this.getValue() === AuditActionType.CONSENT_REVOKED;
  }

  isExpired(): boolean {
    return this.getValue() === AuditActionType.CONSENT_EXPIRED;
  }

  isRenewed(): boolean {
    return this.getValue() === AuditActionType.CONSENT_RENEWED;
  }
}
