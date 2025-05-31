// Prueba unitaria para ConnectionUserId
// Ubicación: src/context/real-time/domain/value-objects/__tests__/connection-user-id.spec.ts
import { ConnectionUserId } from '../connection-user-id';

describe('ConnectionUserId', () => {
  it('debe crear un user ID válido', () => {
    const userId = new ConnectionUserId('user-123');
    expect(userId.value).toBe('user-123');
  });

  it('debe crear user ID con formato UUID', () => {
    const userId = new ConnectionUserId('123e4567-e89b-12d3-a456-426614174000');
    expect(userId.value).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('debe crear user ID con formato alfanumérico', () => {
    const userId = new ConnectionUserId('user_abc123XYZ');
    expect(userId.value).toBe('user_abc123XYZ');
  });

  it('debe crear user ID con caracteres especiales', () => {
    const userId = new ConnectionUserId('user-123_ABC.test');
    expect(userId.value).toBe('user-123_ABC.test');
  });

  it('debe permitir user ID vacío', () => {
    const userId = new ConnectionUserId('');
    expect(userId.value).toBe('');
  });

  it('debe permitir user ID con espacios', () => {
    const userId = new ConnectionUserId('user 123');
    expect(userId.value).toBe('user 123');
  });

  it('debe comparar correctamente dos user IDs iguales', () => {
    const userId1 = new ConnectionUserId('user-123');
    const userId2 = new ConnectionUserId('user-123');

    expect(userId1.equals(userId2)).toBe(true);
  });

  it('debe comparar correctamente dos user IDs diferentes', () => {
    const userId1 = new ConnectionUserId('user-123');
    const userId2 = new ConnectionUserId('user-456');

    expect(userId1.equals(userId2)).toBe(false);
  });

  it('debe ser case sensitive en la comparación', () => {
    const userId1 = new ConnectionUserId('User-123');
    const userId2 = new ConnectionUserId('user-123');

    expect(userId1.equals(userId2)).toBe(false);
  });

  it('debe heredar métodos de PrimitiveValueObject', () => {
    const userId = new ConnectionUserId('user-123');
    
    expect(typeof userId.equals).toBe('function');
    expect(typeof userId.getValue).toBe('function');
    expect(userId.getValue()).toBe('user-123');
  });
});