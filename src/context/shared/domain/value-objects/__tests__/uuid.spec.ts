// Prueba unitaria para Uuid
// Ubicación: src/context/shared/domain/value-objects/__tests__/uuid.spec.ts
import { Uuid } from '../uuid';

describe('Uuid', () => {
  it('debe crear un UUID válido con valor específico', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const uuid = new Uuid(validUuid);
    expect(uuid.value).toBe(validUuid);
  });

  it('debe generar un UUID válido', () => {
    const generatedUuid = Uuid.generate();
    expect(typeof generatedUuid).toBe('string');
    expect(Uuid.validate(generatedUuid)).toBe(true);
  });

  it('debe crear un UUID aleatorio válido', () => {
    const randomUuid = Uuid.random();
    expect(randomUuid).toBeInstanceOf(Uuid);
    expect(Uuid.validate(randomUuid.value)).toBe(true);
  });

  it('debe validar correctamente un UUID válido', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(Uuid.validate(validUuid)).toBe(true);
  });

  it('debe rechazar un UUID inválido', () => {
    const invalidUuid = 'invalid-uuid';
    expect(Uuid.validate(invalidUuid)).toBe(false);
  });

  it('debe lanzar error para UUID con formato inválido', () => {
    expect(() => {
      new Uuid('invalid-uuid');
    }).toThrow('Invalid Uuid format');
  });

  it('debe lanzar error para UUID vacío', () => {
    expect(() => {
      new Uuid('');
    }).toThrow('Invalid Uuid format');
  });

  it('debe comparar correctamente dos UUIDs iguales', () => {
    const uuidValue = '123e4567-e89b-12d3-a456-426614174000';
    const uuid1 = new Uuid(uuidValue);
    const uuid2 = new Uuid(uuidValue);

    expect(uuid1.equals(uuid2)).toBe(true);
  });

  it('debe comparar correctamente dos UUIDs diferentes', () => {
    const uuid1 = new Uuid('123e4567-e89b-12d3-a456-426614174000');
    const uuid2 = new Uuid('987fcdeb-51a2-43d1-9a67-123456789abc');

    expect(uuid1.equals(uuid2)).toBe(false);
  });
});
