// Prueba unitaria para CreatedAt
// Ubicación: src/context/shared/domain/value-objects/__tests__/created-at.spec.ts
import { CreatedAt } from '../created-at';

describe('CreatedAt', () => {
  it('debe crear fecha válida correctamente', () => {
    const now = new Date();
    const createdAt = new CreatedAt(now);
    expect(createdAt.value).toBe(now);
  });

  it('debe crear fecha específica correctamente', () => {
    const specificDate = new Date('2024-01-01T10:00:00Z');
    const createdAt = new CreatedAt(specificDate);
    expect(createdAt.value).toBe(specificDate);
  });

  it('debe lanzar error para fecha inválida', () => {
    const invalidDate = new Date('invalid');
    expect(() => {
      new CreatedAt(invalidDate);
    }).toThrow('CreatedAt must be a valid date');
  });

  it('debe comparar correctamente dos fechas iguales', () => {
    const date = new Date('2024-01-01T10:00:00Z');
    const createdAt1 = new CreatedAt(date);
    const createdAt2 = new CreatedAt(date);

    expect(createdAt1.equals(createdAt2)).toBe(true);
  });

  it('debe comparar correctamente dos fechas diferentes', () => {
    const date1 = new Date('2024-01-01T10:00:00Z');
    const date2 = new Date('2024-01-02T10:00:00Z');
    const createdAt1 = new CreatedAt(date1);
    const createdAt2 = new CreatedAt(date2);

    expect(createdAt1.equals(createdAt2)).toBe(false);
  });

  it('debe manejar fecha en el futuro', () => {
    const futureDate = new Date(Date.now() + 86400000); // +1 día
    const createdAt = new CreatedAt(futureDate);
    expect(createdAt.value).toBe(futureDate);
  });

  it('debe manejar fecha en el pasado', () => {
    const pastDate = new Date('2020-01-01T00:00:00Z');
    const createdAt = new CreatedAt(pastDate);
    expect(createdAt.value).toBe(pastDate);
  });
});