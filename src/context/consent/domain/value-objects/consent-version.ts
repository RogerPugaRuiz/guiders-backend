import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import {
  CONSENT_VERSION_PATTERN,
  getCurrentConsentVersion,
  isConsentVersionAllowed,
  getConsentVersionErrorMessage,
} from '../config/consent-version.config';

/**
 * Value Object para la versión de la política de consentimiento
 * Permite trackear qué versión de la política aceptó el usuario (RGPD Art. 7.1)
 *
 * Formatos aceptados:
 * - v1.0
 * - v1.0.0
 * - v1.2.3-alpha.1
 * - 1.0 (se normaliza a v1.0)
 * - 1.2.3-beta.2 (se normaliza a v1.2.3-beta.2)
 *
 * NOTA: La configuración de versiones se gestiona en:
 * src/context/consent/domain/config/consent-version.config.ts
 */
export class ConsentVersion extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      (v: string) =>
        CONSENT_VERSION_PATTERN.test(v) && isConsentVersionAllowed(v),
      getConsentVersionErrorMessage(value),
    );
  }

  /**
   * Crea una versión desde un string con formato vX.Y o vX.Y.Z
   * Si la versión no comienza con 'v', lo agrega automáticamente
   */
  static fromString(version: string): ConsentVersion {
    const normalized = version.startsWith('v') ? version : `v${version}`;
    return new ConsentVersion(normalized);
  }

  /**
   * Versión actual por defecto de la política de privacidad
   * Se obtiene de la configuración centralizada o variable de entorno
   */
  static current(): ConsentVersion {
    return new ConsentVersion(getCurrentConsentVersion());
  }

  /**
   * Compara si esta versión es más reciente que otra
   */
  isNewerThan(other: ConsentVersion): boolean {
    const thisParts = this.getVersionParts();
    const otherParts = other.getVersionParts();

    for (let i = 0; i < Math.max(thisParts.length, otherParts.length); i++) {
      const thisNum = thisParts[i] || 0;
      const otherNum = otherParts[i] || 0;

      if (thisNum > otherNum) return true;
      if (thisNum < otherNum) return false;
    }

    return false;
  }

  /**
   * Verifica si esta versión es igual a otra
   */
  equals(other: ConsentVersion): boolean {
    return this.value === other.value;
  }

  private getVersionParts(): number[] {
    const versionWithoutPrefix = this.value.replace('v', '');
    const parts = versionWithoutPrefix.split('.');
    return parts.map((part: string) => parseInt(part, 10));
  }
}
