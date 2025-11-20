import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

/**
 * Value Object para el tipo de consentimiento según RGPD
 */
export class ConsentType extends PrimitiveValueObject<string> {
  // Tipos de consentimiento permitidos
  static readonly PRIVACY_POLICY = 'privacy_policy'; // Obligatorio para procesamiento de datos
  static readonly MARKETING = 'marketing'; // Para comunicaciones comerciales (LSSI)
  static readonly ANALYTICS = 'analytics'; // Para cookies y tracking (ePrivacy)

  private static readonly VALID_TYPES = [
    ConsentType.PRIVACY_POLICY,
    ConsentType.MARKETING,
    ConsentType.ANALYTICS,
  ];

  constructor(value: string) {
    super(
      value,
      (v: string) => ConsentType.VALID_TYPES.includes(v),
      `Tipo de consentimiento inválido: ${value}. Tipos válidos: ${ConsentType.VALID_TYPES.join(', ')}`,
    );
  }

  /**
   * Factory methods para crear instancias de tipos específicos
   */
  static privacyPolicy(): ConsentType {
    return new ConsentType(ConsentType.PRIVACY_POLICY);
  }

  static marketing(): ConsentType {
    return new ConsentType(ConsentType.MARKETING);
  }

  static analytics(): ConsentType {
    return new ConsentType(ConsentType.ANALYTICS);
  }

  /**
   * Verifica si es el tipo de política de privacidad (obligatorio)
   */
  isPrivacyPolicy(): boolean {
    return this.value === ConsentType.PRIVACY_POLICY;
  }

  /**
   * Verifica si es tipo marketing
   */
  isMarketing(): boolean {
    return this.value === ConsentType.MARKETING;
  }

  /**
   * Verifica si es tipo analytics
   */
  isAnalytics(): boolean {
    return this.value === ConsentType.ANALYTICS;
  }
}
