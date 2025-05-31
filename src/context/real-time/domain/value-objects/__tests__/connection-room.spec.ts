// Prueba unitaria para ConnectionRoom
// Ubicación: src/context/real-time/domain/value-objects/__tests__/connection-room.spec.ts
import { ConnectionRoom } from '../connection-room';

describe('ConnectionRoom', () => {
  it('debe crear un room válido', () => {
    const room = new ConnectionRoom('room-123');
    expect(room.value).toBe('room-123');
  });

  it('debe crear room con formato UUID', () => {
    const room = new ConnectionRoom('123e4567-e89b-12d3-a456-426614174000');
    expect(room.value).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('debe crear room con formato alfanumérico', () => {
    const room = new ConnectionRoom('room_abc123XYZ');
    expect(room.value).toBe('room_abc123XYZ');
  });

  it('debe crear room con caracteres especiales', () => {
    const room = new ConnectionRoom('room-123_ABC.test');
    expect(room.value).toBe('room-123_ABC.test');
  });

  it('debe permitir room vacío', () => {
    const room = new ConnectionRoom('');
    expect(room.value).toBe('');
  });

  it('debe permitir room con espacios', () => {
    const room = new ConnectionRoom('room 123');
    expect(room.value).toBe('room 123');
  });

  it('debe crear room con nombre descriptivo', () => {
    const room = new ConnectionRoom('chat-customer-support');
    expect(room.value).toBe('chat-customer-support');
  });

  it('debe comparar correctamente dos rooms iguales', () => {
    const room1 = new ConnectionRoom('room-123');
    const room2 = new ConnectionRoom('room-123');

    expect(room1.equals(room2)).toBe(true);
  });

  it('debe comparar correctamente dos rooms diferentes', () => {
    const room1 = new ConnectionRoom('room-123');
    const room2 = new ConnectionRoom('room-456');

    expect(room1.equals(room2)).toBe(false);
  });

  it('debe ser case sensitive en la comparación', () => {
    const room1 = new ConnectionRoom('Room-123');
    const room2 = new ConnectionRoom('room-123');

    expect(room1.equals(room2)).toBe(false);
  });

  it('debe heredar métodos de PrimitiveValueObject', () => {
    const room = new ConnectionRoom('room-123');
    
    expect(typeof room.equals).toBe('function');
    expect(typeof room.getValue).toBe('function');
    expect(room.getValue()).toBe('room-123');
  });
});