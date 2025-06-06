import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para el dominio de la empresa
// Se permite 'localhost' como dominio válido para entornos de desarrollo
const validateCompanyDomain = (value: string) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  (value === 'localhost' || value.includes('.')) &&
  value.length <= 255;

export class CompanyDomain extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      validateCompanyDomain,
      'El dominio de la empresa no es válido',
    );
  }

  public static isValid(value: string): boolean {
    return validateCompanyDomain(value);
  }
}
