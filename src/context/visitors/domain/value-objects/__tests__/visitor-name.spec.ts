// Prueba unitaria para VisitorName
// Ubicación: src/context/visitors/domain/value-objects/__tests__/visitor-name.spec.ts
import { VisitorName } from '../visitor-name';

describe('VisitorName', () => {
  it('debe crear nombre válido', () => {
    const name = new VisitorName('John Doe');
    expect(name.value).toBe('John Doe');
  });

  it('debe crear nombre con caracteres especiales', () => {
    const name = new VisitorName('José María');
    expect(name.value).toBe('José María');
  });

  describe('optional', () => {
    it('debe retornar Optional vacío para valor null', () => {
      const result = VisitorName.optional(null);
      expect(result.isEmpty()).toBe(true);
    });

    it('debe retornar Optional vacío para valor undefined', () => {
      const result = VisitorName.optional(undefined);
      expect(result.isEmpty()).toBe(true);
    });

    it('debe retornar Optional vacío para string vacío', () => {
      const result = VisitorName.optional('');
      expect(result.isEmpty()).toBe(true);
    });

    it('debe retornar Optional vacío para string con solo espacios', () => {
      const result = VisitorName.optional('   ');
      expect(result.isEmpty()).toBe(true);
    });

    it('debe retornar Optional con valor para nombre válido', () => {
      const result = VisitorName.optional('John Doe');
      expect(result.isPresent()).toBe(true);
      expect(result.get().value).toBe('John Doe');
    });
  });
});
