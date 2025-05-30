// Objeto de valor para un array de dominios web de la empresa
import { CompanyDomain } from './company-domain';
import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Valida que el array de dominios no esté vacío y que todos sean válidos
const validateCompanyDomains = (value: string[]) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((d) => CompanyDomain.isValid(d));

export class CompanyDomains extends PrimitiveValueObject<string[]> {
  constructor(value: string[]) {
    super(
      value,
      validateCompanyDomains,
      'Debe haber al menos un dominio válido',
    );
  }

  // Devuelve los dominios como array de CompanyDomain
  public getDomains(): CompanyDomain[] {
    return this.value.map((d) => new CompanyDomain(d));
  }

  // Permite crear desde array de CompanyDomain
  public static fromCompanyDomainArray(
    domains: CompanyDomain[],
  ): CompanyDomains {
    return new CompanyDomains(domains.map((d) => d.getValue()));
  }

  // Permite crear desde array de strings
  public static fromPrimitives(domains: string[]): CompanyDomains {
    return new CompanyDomains(domains);
  }

  // Devuelve los dominios como array de strings
  public toPrimitives(): string[] {
    return [...this.value];
  }
}
