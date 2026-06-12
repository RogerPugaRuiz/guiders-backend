import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para el dominio canónico (principal) de un sitio web
// Se permite 'localhost' como dominio válido para entornos de desarrollo
const validateCanonicalDomain = (value: string) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  (value === 'localhost' ||
    /^localhost:\d+$/.test(value) ||
    value.includes('.')) &&
  value.length <= 255;

export class CanonicalDomain extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value.trim(),
      validateCanonicalDomain,
      'El dominio canónico no es válido',
    );
  }

  public static isValid(value: string): boolean {
    return validateCanonicalDomain(value);
  }
}
