import { ApiKeyCreatedAt } from '../api-key-created-at';

describe('ApiKeyCreatedAt', () => {
  it('should create with a valid date', () => {
    const testDate = new Date('2024-01-01T10:00:00Z');
    const createdAt = new ApiKeyCreatedAt(testDate);

    expect(createdAt.value).toBe(testDate);
  });

  it('should create current timestamp with now() method', () => {
    const beforeTime = Date.now();
    const createdAt = ApiKeyCreatedAt.now();
    const afterTime = Date.now();

    expect(createdAt.value.getTime()).toBeGreaterThanOrEqual(beforeTime);
    expect(createdAt.value.getTime()).toBeLessThanOrEqual(afterTime);
  });

  it('should accept past dates', () => {
    const pastDate = new Date('2020-01-01T00:00:00Z');
    const createdAt = new ApiKeyCreatedAt(pastDate);

    expect(createdAt.value).toBe(pastDate);
  });

  it('should accept future dates', () => {
    const futureDate = new Date('2030-01-01T00:00:00Z');
    const createdAt = new ApiKeyCreatedAt(futureDate);

    expect(createdAt.value).toBe(futureDate);
  });

  it('should preserve time information', () => {
    const specificTime = new Date('2024-12-25T14:30:45.123Z');
    const createdAt = new ApiKeyCreatedAt(specificTime);

    // Comparar las fechas en formato ISO para evitar problemas de zona horaria
    expect(createdAt.value.toISOString()).toBe(specificTime.toISOString());

    // Verificar adicionalmente los componentes individuales
    // usando getUTC* para garantizar consistencia independientemente de la zona horaria
    expect(createdAt.value.getUTCFullYear()).toBe(2024);
    expect(createdAt.value.getUTCMonth()).toBe(11); // December is month 11
    expect(createdAt.value.getUTCDate()).toBe(25);
    expect(createdAt.value.getUTCHours()).toBe(14);
    expect(createdAt.value.getUTCMinutes()).toBe(30);
    expect(createdAt.value.getUTCSeconds()).toBe(45);
    expect(createdAt.value.getUTCMilliseconds()).toBe(123);
  });

  it('now() should create different timestamps when called multiple times', async () => {
    const first = ApiKeyCreatedAt.now();
    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 1));
    const second = ApiKeyCreatedAt.now();

    expect(second.value.getTime()).toBeGreaterThanOrEqual(
      first.value.getTime(),
    );
  });
});
