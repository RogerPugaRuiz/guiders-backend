import { CompanyDomain } from './company-domain';
import { ValidationError } from 'src/context/shared/domain/validation.error';

// Pruebas unitarias para CompanyDomain
// Se asegura que 'localhost' es aceptado como dominio válido

describe('CompanyDomain', () => {
  it('debería aceptar dominios válidos con punto', () => {
    expect(() => new CompanyDomain('example.com')).not.toThrow();
    expect(() => new CompanyDomain('sub.domain.com')).not.toThrow();
  });

  it('debería aceptar localhost como dominio válido', () => {
    expect(() => new CompanyDomain('localhost')).not.toThrow();
  });

  it('debería rechazar dominios vacíos', () => {
    expect(() => new CompanyDomain('')).toThrow(ValidationError);
    expect(() => new CompanyDomain('   ')).toThrow(ValidationError);
  });

  it('debería rechazar dominios sin punto y que no sean localhost', () => {
    expect(() => new CompanyDomain('invalid')).toThrow(ValidationError);
    expect(() => new CompanyDomain('testdomain')).toThrow(ValidationError);
  });

  it('debería rechazar dominios demasiado largos', () => {
    const longDomain = 'a'.repeat(256) + '.com';
    expect(() => new CompanyDomain(longDomain)).toThrow(ValidationError);
  });
});
