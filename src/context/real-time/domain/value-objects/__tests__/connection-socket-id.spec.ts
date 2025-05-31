// Prueba unitaria para ConnectionSocketId
// Ubicación: src/context/real-time/domain/value-objects/__tests__/connection-socket-id.spec.ts
import { ConnectionSocketId } from '../connection-socket-id';

describe('ConnectionSocketId', () => {
  it('debe crear un socket ID válido', () => {
    const socketId = new ConnectionSocketId('socket-123');
    expect(socketId.value).toBe('socket-123');
  });

  it('debe crear socket ID con formato UUID', () => {
    const socketId = new ConnectionSocketId('123e4567-e89b-12d3-a456-426614174000');
    expect(socketId.value).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('debe crear socket ID con formato alfanumérico', () => {
    const socketId = new ConnectionSocketId('socket_abc123XYZ');
    expect(socketId.value).toBe('socket_abc123XYZ');
  });

  it('debe crear socket ID con caracteres especiales', () => {
    const socketId = new ConnectionSocketId('socket-123_ABC.test');
    expect(socketId.value).toBe('socket-123_ABC.test');
  });

  it('debe permitir socket ID vacío', () => {
    const socketId = new ConnectionSocketId('');
    expect(socketId.value).toBe('');
  });

  it('debe permitir socket ID con espacios', () => {
    const socketId = new ConnectionSocketId('socket 123');
    expect(socketId.value).toBe('socket 123');
  });

  it('debe comparar correctamente dos socket IDs iguales', () => {
    const socketId1 = new ConnectionSocketId('socket-123');
    const socketId2 = new ConnectionSocketId('socket-123');

    expect(socketId1.equals(socketId2)).toBe(true);
  });

  it('debe comparar correctamente dos socket IDs diferentes', () => {
    const socketId1 = new ConnectionSocketId('socket-123');
    const socketId2 = new ConnectionSocketId('socket-456');

    expect(socketId1.equals(socketId2)).toBe(false);
  });

  it('debe ser case sensitive en la comparación', () => {
    const socketId1 = new ConnectionSocketId('Socket-123');
    const socketId2 = new ConnectionSocketId('socket-123');

    expect(socketId1.equals(socketId2)).toBe(false);
  });

  it('debe heredar métodos de PrimitiveValueObject', () => {
    const socketId = new ConnectionSocketId('socket-123');
    
    expect(typeof socketId.equals).toBe('function');
    expect(typeof socketId.getValue).toBe('function');
    expect(socketId.getValue()).toBe('socket-123');
  });
});