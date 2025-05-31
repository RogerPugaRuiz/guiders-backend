// Prueba unitaria para IntentTag
// Ubicación: src/context/tracking/domain/value-objects/__tests__/intent-tag.spec.ts
import { IntentTag } from '../intent-tag';

describe('IntentTag', () => {
  it('debe crear un tag válido', () => {
    const tag = new IntentTag('product-interest');
    expect(tag.value).toBe('product-interest');
  });

  it('debe crear tag con un solo carácter', () => {
    const tag = new IntentTag('A');
    expect(tag.value).toBe('A');
  });

  it('debe crear tag con caracteres especiales', () => {
    const tag = new IntentTag('high-value-customer_2024');
    expect(tag.value).toBe('high-value-customer_2024');
  });

  it('debe crear tag con espacios válidos', () => {
    const tag = new IntentTag('high value customer');
    expect(tag.value).toBe('high value customer');
  });

  it('debe crear tag con números', () => {
    const tag = new IntentTag('category-123');
    expect(tag.value).toBe('category-123');
  });

  it('debe lanzar error para tag vacío', () => {
    expect(() => {
      new IntentTag('');
    }).toThrow('IntentTag debe ser un string no vacío');
  });

  it('debe lanzar error para tag con solo espacios', () => {
    expect(() => {
      new IntentTag('   ');
    }).toThrow('IntentTag debe ser un string no vacío');
  });

  it('debe lanzar error para valor no string', () => {
    expect(() => {
      new IntentTag(null as any);
    }).toThrow('IntentTag debe ser un string no vacío');

    expect(() => {
      new IntentTag(123 as any);
    }).toThrow('IntentTag debe ser un string no vacío');

    expect(() => {
      new IntentTag(undefined as any);
    }).toThrow('IntentTag debe ser un string no vacío');
  });

  it('debe lanzar error para objeto', () => {
    expect(() => {
      new IntentTag({} as any);
    }).toThrow('IntentTag debe ser un string no vacío');
  });

  it('debe lanzar error para array', () => {
    expect(() => {
      new IntentTag([] as any);
    }).toThrow('IntentTag debe ser un string no vacío');
  });

  it('debe comparar correctamente dos tags iguales', () => {
    const tag1 = new IntentTag('product-interest');
    const tag2 = new IntentTag('product-interest');

    expect(tag1.equals(tag2)).toBe(true);
  });

  it('debe comparar correctamente dos tags diferentes', () => {
    const tag1 = new IntentTag('product-interest');
    const tag2 = new IntentTag('price-sensitive');

    expect(tag1.equals(tag2)).toBe(false);
  });

  it('debe ser case sensitive en la comparación', () => {
    const tag1 = new IntentTag('Product-Interest');
    const tag2 = new IntentTag('product-interest');

    expect(tag1.equals(tag2)).toBe(false);
  });

  it('debe heredar métodos de PrimitiveValueObject', () => {
    const tag = new IntentTag('product-interest');

    expect(typeof tag.equals).toBe('function');
    expect(typeof tag.getValue).toBe('function');
    expect(tag.getValue()).toBe('product-interest');
  });
});
