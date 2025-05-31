// Prueba unitaria para UpdatedAt
// Ubicación: src/context/shared/domain/value-objects/__tests__/updated-at.spec.ts
import { UpdatedAt } from '../updated-at';

describe('UpdatedAt', () => {
  it('debe crear fecha de actualización válida', () => {
    const now = new Date();
    const updatedAt = new UpdatedAt(now);
    expect(updatedAt.value).toBe(now);
  });

  it('debe crear fecha específica correctamente', () => {
    const specificDate = new Date('2024-05-15T14:30:00Z');
    const updatedAt = new UpdatedAt(specificDate);
    expect(updatedAt.value).toBe(specificDate);
  });

  it('debe lanzar error para fecha inválida', () => {
    const invalidDate = new Date('invalid');
    expect(() => {
      new UpdatedAt(invalidDate);
    }).toThrow('UpdatedAt must be a valid date');
  });

  it('debe comparar correctamente dos fechas iguales', () => {
    const date = new Date('2024-05-15T14:30:00Z');
    const updatedAt1 = new UpdatedAt(date);
    const updatedAt2 = new UpdatedAt(date);

    expect(updatedAt1.equals(updatedAt2)).toBe(true);
  });

  it('debe comparar correctamente dos fechas diferentes', () => {
    const date1 = new Date('2024-05-15T14:30:00Z');
    const date2 = new Date('2024-05-16T14:30:00Z');
    const updatedAt1 = new UpdatedAt(date1);
    const updatedAt2 = new UpdatedAt(date2);

    expect(updatedAt1.equals(updatedAt2)).toBe(false);
  });

  it('debe manejar actualización reciente', () => {
    const recentDate = new Date(Date.now() - 1000); // -1 segundo
    const updatedAt = new UpdatedAt(recentDate);
    expect(updatedAt.value).toBe(recentDate);
  });

  it('debe poder representar última actualización', () => {
    const lastUpdated = new Date('2023-12-31T23:59:59Z');
    const updatedAt = new UpdatedAt(lastUpdated);
    expect(updatedAt.value).toBe(lastUpdated);
  });
});
