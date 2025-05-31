// Prueba unitaria para IntentType
// Ubicación: src/context/tracking/domain/value-objects/__tests__/intent-type.spec.ts
import { IntentType } from '../intent-type';

describe('IntentType', () => {
  it('debe crear tipo de intención PURCHASE', () => {
    const intentType = new IntentType(IntentType.PURCHASE);
    expect(intentType.value).toBe('PURCHASE');
  });

  it('debe crear tipo de intención RESEARCH', () => {
    const intentType = new IntentType(IntentType.RESEARCH);
    expect(intentType.value).toBe('RESEARCH');
  });

  it('debe tener constantes estáticas definidas', () => {
    expect(IntentType.PURCHASE).toBe('PURCHASE');
    expect(IntentType.RESEARCH).toBe('RESEARCH');
  });

  it('debe lanzar error para tipo inválido', () => {
    expect(() => {
      new IntentType('INVALID_TYPE');
    }).toThrow('El tipo de intención debe ser PURCHASE o RESEARCH');
  });

  it('debe lanzar error para tipo vacío', () => {
    expect(() => {
      new IntentType('');
    }).toThrow('El tipo de intención debe ser PURCHASE o RESEARCH');
  });

  it('debe ser case sensitive', () => {
    expect(() => {
      new IntentType('purchase');
    }).toThrow('El tipo de intención debe ser PURCHASE o RESEARCH');
  });

  it('debe comparar correctamente dos tipos iguales', () => {
    const type1 = new IntentType(IntentType.PURCHASE);
    const type2 = new IntentType(IntentType.PURCHASE);

    expect(type1.equals(type2)).toBe(true);
  });

  it('debe comparar correctamente dos tipos diferentes', () => {
    const type1 = new IntentType(IntentType.PURCHASE);
    const type2 = new IntentType(IntentType.RESEARCH);

    expect(type1.equals(type2)).toBe(false);
  });
});
