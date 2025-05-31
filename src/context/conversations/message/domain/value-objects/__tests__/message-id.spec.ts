// Prueba unitaria para MessageId
// Ubicación: src/context/conversations/message/domain/value-objects/__tests__/message-id.spec.ts
import { MessageId } from '../message-id';

describe('MessageId', () => {
  it('debe crear un message ID válido con UUID específico', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const messageId = new MessageId(validUuid);
    expect(messageId.value).toBe(validUuid);
  });

  it('debe heredar de UuidValueObject', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const messageId = new MessageId(validUuid);
    expect(messageId.value).toBe(validUuid);
  });

  it('debe lanzar error para UUID con formato inválido', () => {
    expect(() => {
      new MessageId('invalid-uuid');
    }).toThrow();
  });

  it('debe lanzar error para UUID vacío', () => {
    expect(() => {
      new MessageId('');
    }).toThrow();
  });

  it('debe lanzar error para UUID null', () => {
    expect(() => {
      new MessageId(null as any);
    }).toThrow();
  });

  it('debe lanzar error para UUID undefined', () => {
    expect(() => {
      new MessageId(undefined as any);
    }).toThrow();
  });

  it('debe comparar correctamente dos message IDs iguales', () => {
    const uuidValue = '123e4567-e89b-12d3-a456-426614174000';
    const messageId1 = new MessageId(uuidValue);
    const messageId2 = new MessageId(uuidValue);

    expect(messageId1.equals(messageId2)).toBe(true);
  });

  it('debe comparar correctamente dos message IDs diferentes', () => {
    const messageId1 = new MessageId('123e4567-e89b-12d3-a456-426614174000');
    const messageId2 = new MessageId('987fcdeb-51a2-43d1-9f33-426614174111');

    expect(messageId1.equals(messageId2)).toBe(false);
  });

  it('debe validar correctamente el formato UUID', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(() => {
      new MessageId(validUuid);
    }).not.toThrow();
  });

  it('debe heredar métodos de UuidValueObject', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const messageId = new MessageId(validUuid);
    
    expect(typeof messageId.equals).toBe('function');
    expect(typeof messageId.getValue).toBe('function');
    expect(messageId.getValue()).toBe(validUuid);
  });

  it('debe aceptar UUIDs en diferentes formatos válidos', () => {
    const uuids = [
      '123e4567-e89b-12d3-a456-426614174000',
      '550e8400-e29b-41d4-a716-446655440000',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    ];

    uuids.forEach(uuid => {
      expect(() => {
        new MessageId(uuid);
      }).not.toThrow();
    });
  });

  it('debe rechazar UUIDs con formato incorrecto', () => {
    const invalidUuids = [
      '123e4567-e89b-12d3-a456-42661417400',  // Un carácter menos
      '123e4567-e89b-12d3-a456-4266141740000', // Un carácter más
      '123e4567-e89b-12d3-a456-42661417400g',  // Carácter inválido
      '123e4567e89b12d3a456426614174000',      // Sin guiones
      '123E4567-E89B-12D3-A456-426614174000',  // Mayúsculas (depende de implementación)
    ];

    invalidUuids.forEach(uuid => {
      expect(() => {
        new MessageId(uuid);
      }).toThrow();
    });
  });

  it('debe funcionar con UUIDs generados por diferentes métodos', () => {
    // Simular UUID generado
    const mockUuid = '550e8400-e29b-41d4-a716-446655440000';
    
    expect(() => {
      new MessageId(mockUuid);
    }).not.toThrow();
    
    const messageId = new MessageId(mockUuid);
    expect(messageId.value).toBe(mockUuid);
  });
});