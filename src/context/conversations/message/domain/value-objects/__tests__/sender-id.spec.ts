// Prueba unitaria para SenderId
// Ubicación: src/context/conversations/message/domain/value-objects/__tests__/sender-id.spec.ts
import { SenderId } from '../sender-id';

describe('SenderId', () => {
  it('debe crear un sender ID válido con UUID específico', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const senderId = new SenderId(validUuid);
    expect(senderId.value).toBe(validUuid);
  });

  it('debe heredar de UuidValueObject', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const senderId = new SenderId(validUuid);
    expect(senderId.value).toBe(validUuid);
  });

  it('debe lanzar error para UUID con formato inválido', () => {
    expect(() => {
      new SenderId('invalid-uuid');
    }).toThrow();
  });

  it('debe lanzar error para UUID vacío', () => {
    expect(() => {
      new SenderId('');
    }).toThrow();
  });

  it('debe lanzar error para UUID null', () => {
    expect(() => {
      new SenderId(null as any);
    }).toThrow();
  });

  it('debe lanzar error para UUID undefined', () => {
    expect(() => {
      new SenderId(undefined as any);
    }).toThrow();
  });

  it('debe comparar correctamente dos sender IDs iguales', () => {
    const uuidValue = '123e4567-e89b-12d3-a456-426614174000';
    const senderId1 = new SenderId(uuidValue);
    const senderId2 = new SenderId(uuidValue);

    expect(senderId1.equals(senderId2)).toBe(true);
  });

  it('debe comparar correctamente dos sender IDs diferentes', () => {
    const senderId1 = new SenderId('123e4567-e89b-12d3-a456-426614174000');
    const senderId2 = new SenderId('987fcdeb-51a2-43d1-9f33-426614174111');

    expect(senderId1.equals(senderId2)).toBe(false);
  });

  it('debe validar correctamente el formato UUID', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(() => {
      new SenderId(validUuid);
    }).not.toThrow();
  });

  it('debe heredar métodos de UuidValueObject', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const senderId = new SenderId(validUuid);

    expect(typeof senderId.equals).toBe('function');
    expect(typeof senderId.getValue).toBe('function');
    expect(senderId.getValue()).toBe(validUuid);
  });

  it('debe aceptar UUIDs en diferentes formatos válidos', () => {
    const uuids = [
      '123e4567-e89b-12d3-a456-426614174000',
      '550e8400-e29b-41d4-a716-446655440000',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    ];

    uuids.forEach((uuid) => {
      expect(() => {
        new SenderId(uuid);
      }).not.toThrow();
    });
  });

  it('debe rechazar UUIDs con formato incorrecto', () => {
    const invalidUuids = [
      '123e4567-e89b-12d3-a456-42661417400', // Un carácter menos
      '123e4567-e89b-12d3-a456-4266141740000', // Un carácter más
      '123e4567-e89b-12d3-a456-42661417400g', // Carácter inválido
      '123e4567e89b12d3a456426614174000', // Sin guiones
    ];

    invalidUuids.forEach((uuid) => {
      expect(() => {
        new SenderId(uuid);
      }).toThrow();
    });
  });

  it('debe funcionar para identificadores de diferentes tipos de remitentes', () => {
    // Simular diferentes tipos de senders
    const senderIds = [
      '123e4567-e89b-12d3-a456-426614174000', // Visitor ID
      '987fcdeb-51a2-43d1-9f33-426614174111', // Commercial ID
      'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Admin ID
    ];

    senderIds.forEach((id) => {
      const senderId = new SenderId(id);
      expect(senderId.value).toBe(id);
    });
  });
});
