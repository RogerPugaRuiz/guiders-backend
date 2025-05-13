import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para el dominio de la empresa
const validateCompanyDomain = (value: string) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.includes('.') &&
  value.length <= 255;

export class CompanyDomain extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      validateCompanyDomain,
      'El dominio de la empresa no es válido',
    );
  }
}
