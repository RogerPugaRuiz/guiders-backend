// Prueba unitaria para VisitorEmail
// Ubicación: src/context/visitors/domain/value-objects/__tests__/visitor-email.spec.ts
import { VisitorEmail } from '../visitor-email';

describe('VisitorEmail', () => {
  it('debe crear email válido', () => {
    const email = new VisitorEmail('test@example.com');
    expect(email.value).toBe('test@example.com');
  });

  it('debe crear email válido con diferentes dominios', () => {
    const email = new VisitorEmail('user@test.org');
    expect(email.value).toBe('user@test.org');
  });

  it('debe lanzar error para email inválido', () => {
    expect(() => {
      new VisitorEmail('invalid-email');
    }).toThrow('Invalid email format');
  });

  it('debe lanzar error para email vacío', () => {
    expect(() => {
      new VisitorEmail('');
    }).toThrow('Invalid email format');
  });

  describe('optional', () => {
    it('debe retornar Optional vacío para valor null', () => {
      const result = VisitorEmail.optional(null);
      expect(result.isEmpty()).toBe(true);
    });

    it('debe retornar Optional vacío para valor undefined', () => {
      const result = VisitorEmail.optional(undefined);
      expect(result.isEmpty()).toBe(true);
    });

    it('debe retornar Optional vacío para string vacío', () => {
      const result = VisitorEmail.optional('');
      expect(result.isEmpty()).toBe(true);
    });

    it('debe retornar Optional vacío para string con solo espacios', () => {
      const result = VisitorEmail.optional('   ');
      expect(result.isEmpty()).toBe(true);
    });

    it('debe retornar Optional con valor para email válido', () => {
      const result = VisitorEmail.optional('test@example.com');
      expect(result.isPresent()).toBe(true);
      expect(result.get().value).toBe('test@example.com');
    });
  });
});