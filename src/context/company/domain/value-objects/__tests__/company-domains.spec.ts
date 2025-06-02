// Prueba unitaria para CompanyDomains
// Ubicación: src/context/company/domain/value-objects/__tests__/company-domains.spec.ts
import { CompanyDomains } from '../company-domains';
import { CompanyDomain } from '../company-domain';

describe('CompanyDomains', () => {
  it('debe crear lista de dominios válida', () => {
    const domains = new CompanyDomains(['example.com', 'test.org']);
    expect(domains.toPrimitives()).toEqual(['example.com', 'test.org']);
  });

  it('debe crear con un solo dominio', () => {
    const domains = new CompanyDomains(['example.com']);
    expect(domains.toPrimitives()).toEqual(['example.com']);
  });

  it('debe permitir localhost como dominio válido', () => {
    const domains = new CompanyDomains(['localhost', 'example.com']);
    expect(domains.toPrimitives()).toEqual(['localhost', 'example.com']);
  });

  it('debe devolver array de CompanyDomain objects', () => {
    const domains = new CompanyDomains(['example.com', 'test.org']);
    const domainObjects = domains.getDomains();

    expect(domainObjects).toHaveLength(2);
    expect(domainObjects[0]).toBeInstanceOf(CompanyDomain);
    expect(domainObjects[1]).toBeInstanceOf(CompanyDomain);
    expect(domainObjects[0].getValue()).toBe('example.com');
    expect(domainObjects[1].getValue()).toBe('test.org');
  });

  it('debe crear desde array de CompanyDomain', () => {
    const domain1 = new CompanyDomain('example.com');
    const domain2 = new CompanyDomain('test.org');
    const domains = CompanyDomains.fromCompanyDomainArray([domain1, domain2]);

    expect(domains.toPrimitives()).toEqual(['example.com', 'test.org']);
  });

  it('debe crear desde primitivos', () => {
    const domains = CompanyDomains.fromPrimitives(['example.com', 'test.org']);
    expect(domains.toPrimitives()).toEqual(['example.com', 'test.org']);
  });

  it('debe lanzar error para array vacío', () => {
    expect(() => {
      new CompanyDomains([]);
    }).toThrow('Debe haber al menos un dominio válido');
  });

  it('debe lanzar error para dominio inválido en el array', () => {
    expect(() => {
      new CompanyDomains(['example.com', 'invalid-domain']);
    }).toThrow('Debe haber al menos un dominio válido');
  });

  it('debe lanzar error para valor no array', () => {
    expect(() => {
      new CompanyDomains(null as any);
    }).toThrow('Debe haber al menos un dominio válido');

    expect(() => {
      new CompanyDomains('not-an-array' as any);
    }).toThrow('Debe haber al menos un dominio válido');
  });

  it('debe lanzar error para array con dominio vacío', () => {
    expect(() => {
      new CompanyDomains(['example.com', '']);
    }).toThrow('Debe haber al menos un dominio válido');
  });

  it('debe lanzar error para array con solo espacios', () => {
    expect(() => {
      new CompanyDomains(['example.com', '   ']);
    }).toThrow('Debe haber al menos un dominio válido');
  });

  it('debe comparar correctamente dos listas iguales', () => {
    const domains1 = new CompanyDomains(['example.com', 'test.org']);
    const domains2 = new CompanyDomains(['example.com', 'test.org']);

    // Para arrays, comparamos los valores internos porque arrays son objetos por referencia
    expect(domains1.toPrimitives()).toEqual(domains2.toPrimitives());
  });

  it('debe comparar correctamente dos listas diferentes', () => {
    const domains1 = new CompanyDomains(['example.com']);
    const domains2 = new CompanyDomains(['test.org']);

    expect(domains1.toPrimitives()).not.toEqual(domains2.toPrimitives());
  });

  it('debe comparar correctamente listas con diferente orden', () => {
    const domains1 = new CompanyDomains(['example.com', 'test.org']);
    const domains2 = new CompanyDomains(['test.org', 'example.com']);

    expect(domains1.toPrimitives()).not.toEqual(domains2.toPrimitives());
  });
});
