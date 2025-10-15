import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

/**
 * Value Object para el estado del consentimiento según RGPD
 */
export class ConsentStatus extends PrimitiveValueObject<string> {
  // Estados posibles del consentimiento
  static readonly GRANTED = 'granted'; // Consentimiento otorgado
  static readonly DENIED = 'denied'; // Consentimiento rechazado explícitamente
  static readonly REVOKED = 'revoked'; // Consentimiento revocado por el usuario
  static readonly EXPIRED = 'expired'; // Consentimiento expirado (requiere renovación)

  private static readonly VALID_STATUSES = [
    ConsentStatus.GRANTED,
    ConsentStatus.DENIED,
    ConsentStatus.REVOKED,
    ConsentStatus.EXPIRED,
  ];

  constructor(value: string) {
    super(
      value,
      (v: string) => ConsentStatus.VALID_STATUSES.includes(v),
      `Estado de consentimiento inválido: ${value}. Estados válidos: ${ConsentStatus.VALID_STATUSES.join(', ')}`,
    );
  }

  /**
   * Factory methods para crear instancias de estados específicos
   */
  static granted(): ConsentStatus {
    return new ConsentStatus(ConsentStatus.GRANTED);
  }

  static denied(): ConsentStatus {
    return new ConsentStatus(ConsentStatus.DENIED);
  }

  static revoked(): ConsentStatus {
    return new ConsentStatus(ConsentStatus.REVOKED);
  }

  static expired(): ConsentStatus {
    return new ConsentStatus(ConsentStatus.EXPIRED);
  }

  /**
   * Verifica si el consentimiento está activo (otorgado)
   */
  isActive(): boolean {
    return this.value === ConsentStatus.GRANTED;
  }

  /**
   * Verifica si el consentimiento fue rechazado
   */
  isDenied(): boolean {
    return this.value === ConsentStatus.DENIED;
  }

  /**
   * Verifica si el consentimiento fue revocado
   */
  isRevoked(): boolean {
    return this.value === ConsentStatus.REVOKED;
  }

  /**
   * Verifica si el consentimiento expiró
   */
  isExpired(): boolean {
    return this.value === ConsentStatus.EXPIRED;
  }

  /**
   * Verifica si se puede usar el consentimiento para procesar datos
   */
  canProcessData(): boolean {
    return this.isActive();
  }
}
