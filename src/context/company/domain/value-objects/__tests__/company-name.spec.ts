// Prueba unitaria para CompanyName
// Ubicación: src/context/company/domain/value-objects/__tests__/company-name.spec.ts
import { CompanyName } from '../company-name';

describe('CompanyName', () => {
  it('debe crear nombre de empresa válido', () => {
    const name = new CompanyName('Acme Corporation');
    expect(name.value).toBe('Acme Corporation');
  });

  it('debe crear nombre con caracteres especiales', () => {
    const name = new CompanyName('Empresa S.A.');
    expect(name.value).toBe('Empresa S.A.');
  });

  it('debe crear nombre con números', () => {
    const name = new CompanyName('Company 123');
    expect(name.value).toBe('Company 123');
  });

  it('debe lanzar error para nombre vacío', () => {
    expect(() => {
      new CompanyName('');
    }).toThrow('El nombre de la empresa no puede estar vacío');
  });

  it('debe permitir nombres largos', () => {
    const longName = 'Very Long Company Name With Many Words In It Corporation';
    const name = new CompanyName(longName);
    expect(name.value).toBe(longName);
  });

  it('debe comparar correctamente dos nombres iguales', () => {
    const name1 = new CompanyName('Test Company');
    const name2 = new CompanyName('Test Company');

    expect(name1.equals(name2)).toBe(true);
  });

  it('debe comparar correctamente dos nombres diferentes', () => {
    const name1 = new CompanyName('Company A');
    const name2 = new CompanyName('Company B');

    expect(name1.equals(name2)).toBe(false);
  });

  it('should accept single character name', () => {
    const name = new CompanyName('A');
    expect(name.value).toBe('A');
  });

  it('should throw error for null value', () => {
    expect(() => new CompanyName(null as any)).toThrow(
      'El nombre de la empresa no puede estar vacío'
    );
  });

  it('should throw error for undefined value', () => {
    expect(() => new CompanyName(undefined as any)).toThrow(
      'El nombre de la empresa no puede estar vacío'
    );
  });

  it('should preserve whitespace in names', () => {
    const nameWithSpaces = '  Company   Name  ';
    const name = new CompanyName(nameWithSpaces);
    expect(name.value).toBe(nameWithSpaces);
  });
});
