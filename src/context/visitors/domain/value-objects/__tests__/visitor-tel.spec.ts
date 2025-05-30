// Prueba unitaria para VisitorTel
// Ubicación: src/context/visitors/domain/value-objects/__tests__/visitor-tel.spec.ts
import { VisitorTel } from '../visitor-tel';

describe('VisitorTel', () => {
  it('debe crear teléfono válido con formato básico', () => {
    const tel = new VisitorTel('1234567890');
    expect(tel.value).toBe('1234567890');
  });

  it('debe crear teléfono válido con código de país', () => {
    const tel = new VisitorTel('+34123456789');
    expect(tel.value).toBe('+34123456789');
  });

  it('debe crear teléfono válido con espacios', () => {
    const tel = new VisitorTel('+34 123 456 789');
    expect(tel.value).toBe('+34 123 456 789');
  });

  it('debe crear teléfono válido con guiones', () => {
    const tel = new VisitorTel('123-456-7890');
    expect(tel.value).toBe('123-456-7890');
  });

  it('debe crear teléfono válido con paréntesis', () => {
    const tel = new VisitorTel('(123) 456-7890');
    expect(tel.value).toBe('(123) 456-7890');
  });

  it('debe lanzar error para teléfono muy corto', () => {
    expect(() => {
      new VisitorTel('123');
    }).toThrow('Invalid phone number format');
  });

  it('debe lanzar error para teléfono con letras', () => {
    expect(() => {
      new VisitorTel('123abc456');
    }).toThrow('Invalid phone number format');
  });

  it('debe lanzar error para teléfono vacío', () => {
    expect(() => {
      new VisitorTel('');
    }).toThrow('Invalid phone number format');
  });

  describe('optional', () => {
    it('debe retornar Optional vacío para valor null', () => {
      const result = VisitorTel.optional(null);
      expect(result.isEmpty()).toBe(true);
    });

    it('debe retornar Optional vacío para valor undefined', () => {
      const result = VisitorTel.optional(undefined);
      expect(result.isEmpty()).toBe(true);
    });

    it('debe retornar Optional vacío para string vacío', () => {
      const result = VisitorTel.optional('');
      expect(result.isEmpty()).toBe(true);
    });

    it('debe retornar Optional vacío para string con solo espacios', () => {
      const result = VisitorTel.optional('   ');
      expect(result.isEmpty()).toBe(true);
    });

    it('debe retornar Optional con valor para teléfono válido', () => {
      const result = VisitorTel.optional('+34123456789');
      expect(result.isPresent()).toBe(true);
      expect(result.get().value).toBe('+34123456789');
    });
  });
});