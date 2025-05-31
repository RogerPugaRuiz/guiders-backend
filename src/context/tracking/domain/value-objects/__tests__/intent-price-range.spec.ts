// Prueba unitaria para IntentPriceRange
// Ubicación: src/context/tracking/domain/value-objects/__tests__/intent-price-range.spec.ts
import { IntentPriceRange } from '../intent-price-range';

describe('IntentPriceRange', () => {
  it('debe crear un rango de precio válido', () => {
    const priceRange = new IntentPriceRange({ min: 100, max: 500 });
    expect(priceRange.value.min).toBe(100);
    expect(priceRange.value.max).toBe(500);
  });

  it('debe crear rango con min y max iguales', () => {
    const priceRange = new IntentPriceRange({ min: 100, max: 100 });
    expect(priceRange.value.min).toBe(100);
    expect(priceRange.value.max).toBe(100);
  });

  it('debe crear rango con valores decimales', () => {
    const priceRange = new IntentPriceRange({ min: 99.99, max: 199.99 });
    expect(priceRange.value.min).toBe(99.99);
    expect(priceRange.value.max).toBe(199.99);
  });

  it('debe crear rango con min 0', () => {
    const priceRange = new IntentPriceRange({ min: 0, max: 100 });
    expect(priceRange.value.min).toBe(0);
    expect(priceRange.value.max).toBe(100);
  });

  it('debe generar toString correctamente', () => {
    const priceRange = new IntentPriceRange({ min: 100, max: 500 });
    expect(priceRange.toString()).toBe('100 - 500');
  });

  it('debe generar toString con decimales', () => {
    const priceRange = new IntentPriceRange({ min: 99.99, max: 199.99 });
    expect(priceRange.toString()).toBe('99.99 - 199.99');
  });

  it('debe lanzar error para min negativo', () => {
    expect(() => {
      new IntentPriceRange({ min: -10, max: 100 });
    }).toThrow('IntentPriceRange debe tener min >= 0 y max >= min');
  });

  it('debe lanzar error para max menor que min', () => {
    expect(() => {
      new IntentPriceRange({ min: 100, max: 50 });
    }).toThrow('IntentPriceRange debe tener min >= 0 y max >= min');
  });

  it('debe lanzar error para valor no objeto', () => {
    expect(() => {
      new IntentPriceRange(null as any);
    }).toThrow('IntentPriceRange debe tener min >= 0 y max >= min');

    expect(() => {
      new IntentPriceRange('invalid' as any);
    }).toThrow('IntentPriceRange debe tener min >= 0 y max >= min');
  });

  it('debe lanzar error para min no numérico', () => {
    expect(() => {
      new IntentPriceRange({ min: 'invalid' as any, max: 100 });
    }).toThrow('IntentPriceRange debe tener min >= 0 y max >= min');
  });

  it('debe lanzar error para max no numérico', () => {
    expect(() => {
      new IntentPriceRange({ min: 100, max: 'invalid' as any });
    }).toThrow('IntentPriceRange debe tener min >= 0 y max >= min');
  });

  it('debe lanzar error para objeto sin propiedades min/max', () => {
    expect(() => {
      new IntentPriceRange({} as any);
    }).toThrow('IntentPriceRange debe tener min >= 0 y max >= min');
  });

  it('debe lanzar error para objeto con solo min', () => {
    expect(() => {
      new IntentPriceRange({ min: 100 } as any);
    }).toThrow('IntentPriceRange debe tener min >= 0 y max >= min');
  });

  it('debe lanzar error para objeto con solo max', () => {
    expect(() => {
      new IntentPriceRange({ max: 100 } as any);
    }).toThrow('IntentPriceRange debe tener min >= 0 y max >= min');
  });

  it('debe comparar correctamente dos rangos iguales', () => {
    const range1 = new IntentPriceRange({ min: 100, max: 500 });
    const range2 = new IntentPriceRange({ min: 100, max: 500 });

    expect(range1.equals(range2)).toBe(true);
  });

  it('debe comparar correctamente dos rangos diferentes', () => {
    const range1 = new IntentPriceRange({ min: 100, max: 500 });
    const range2 = new IntentPriceRange({ min: 200, max: 600 });

    expect(range1.equals(range2)).toBe(false);
  });

  it('debe heredar métodos de PrimitiveValueObject', () => {
    const priceRange = new IntentPriceRange({ min: 100, max: 500 });
    
    expect(typeof priceRange.equals).toBe('function');
    expect(typeof priceRange.toString).toBe('function');
  });
});