// Prueba unitaria para UserId
// Ubicación: src/context/auth/auth-user/domain/value-objects/__tests__/user-id.spec.ts
import { UserId } from '../user-id';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('UserId', () => {
  it('debe crear un user ID válido con UUID específico', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const userId = new UserId(validUuid);
    expect(userId.value).toBe(validUuid);
  });

  it('debe heredar de Uuid', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const userId = new UserId(validUuid);
    expect(userId).toBeInstanceOf(Uuid);
  });

  it('debe crear user ID aleatorio usando método estático', () => {
    const userId = UserId.random();
    expect(userId).toBeInstanceOf(UserId);
    expect(userId).toBeInstanceOf(Uuid);
    expect(Uuid.validate(userId.value)).toBe(true);
  });

  it('debe generar diferentes IDs aleatorios', () => {
    const userId1 = UserId.random();
    const userId2 = UserId.random();
    
    expect(userId1.value).not.toBe(userId2.value);
  });

  it('debe lanzar error para UUID con formato inválido', () => {
    expect(() => {
      new UserId('invalid-uuid');
    }).toThrow('Invalid Uuid format');
  });

  it('debe lanzar error para UUID vacío', () => {
    expect(() => {
      new UserId('');
    }).toThrow('Invalid Uuid format');
  });

  it('debe lanzar error para UUID null', () => {
    expect(() => {
      new UserId(null as any);
    }).toThrow('Invalid Uuid format');
  });

  it('debe lanzar error para UUID undefined', () => {
    expect(() => {
      new UserId(undefined as any);
    }).toThrow('Invalid Uuid format');
  });

  it('debe comparar correctamente dos user IDs iguales', () => {
    const uuidValue = '123e4567-e89b-12d3-a456-426614174000';
    const userId1 = new UserId(uuidValue);
    const userId2 = new UserId(uuidValue);

    expect(userId1.equals(userId2)).toBe(true);
  });

  it('debe comparar correctamente dos user IDs diferentes', () => {
    const userId1 = new UserId('123e4567-e89b-12d3-a456-426614174000');
    const userId2 = new UserId('987fcdeb-51a2-43d1-9f33-426614174111');

    expect(userId1.equals(userId2)).toBe(false);
  });

  it('debe validar correctamente el formato UUID', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(() => {
      new UserId(validUuid);
    }).not.toThrow();
  });

  it('debe heredar métodos de Uuid', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const userId = new UserId(validUuid);
    
    expect(typeof userId.toString).toBe('function');
    expect(typeof userId.equals).toBe('function');
    expect(userId.toString()).toBe(validUuid);
  });

  it('debe crear IDs aleatorios válidos múltiples veces', () => {
    for (let i = 0; i < 10; i++) {
      const userId = UserId.random();
      expect(Uuid.validate(userId.value)).toBe(true);
    }
  });

  it('debe funcionar con otros métodos estáticos de Uuid', () => {
    const generatedUuid = Uuid.generate();
    const userId = new UserId(generatedUuid);
    
    expect(userId.value).toBe(generatedUuid);
    expect(Uuid.validate(userId.value)).toBe(true);
  });
});