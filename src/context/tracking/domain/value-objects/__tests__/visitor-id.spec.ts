// Prueba unitaria para VisitorId (tracking context)
// Ubicación: src/context/tracking/domain/value-objects/__tests__/visitor-id.spec.ts
import { VisitorId } from '../visitor-id';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('VisitorId (tracking)', () => {
  it('debe crear un visitor ID válido con UUID específico', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const visitorId = new VisitorId(validUuid);
    expect(visitorId.value).toBe(validUuid);
  });

  it('debe heredar de Uuid', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const visitorId = new VisitorId(validUuid);
    expect(visitorId).toBeInstanceOf(Uuid);
  });

  it('debe lanzar error para UUID con formato inválido', () => {
    expect(() => {
      new VisitorId('invalid-uuid');
    }).toThrow('Invalid Uuid format');
  });

  it('debe lanzar error para UUID vacío', () => {
    expect(() => {
      new VisitorId('');
    }).toThrow('Invalid Uuid format');
  });

  it('debe comparar correctamente dos visitor IDs iguales', () => {
    const uuidValue = '123e4567-e89b-12d3-a456-426614174000';
    const visitorId1 = new VisitorId(uuidValue);
    const visitorId2 = new VisitorId(uuidValue);

    expect(visitorId1.equals(visitorId2)).toBe(true);
  });

  it('debe comparar correctamente dos visitor IDs diferentes', () => {
    const visitorId1 = new VisitorId('123e4567-e89b-12d3-a456-426614174000');
    const visitorId2 = new VisitorId('987fcdeb-51a2-43d1-9f33-426614174111');

    expect(visitorId1.equals(visitorId2)).toBe(false);
  });

  it('debe validar correctamente el formato UUID', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(() => {
      new VisitorId(validUuid);
    }).not.toThrow();
  });

  it('debe heredar métodos de Uuid', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const visitorId = new VisitorId(validUuid);

    expect(typeof visitorId.equals).toBe('function');
    expect(typeof visitorId.getValue).toBe('function');
    expect(visitorId.getValue()).toBe(validUuid);
  });
});
