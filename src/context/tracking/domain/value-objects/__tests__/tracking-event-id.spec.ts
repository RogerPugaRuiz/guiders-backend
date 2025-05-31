// Prueba unitaria para TrackingEventId
// Ubicación: src/context/tracking/domain/value-objects/__tests__/tracking-event-id.spec.ts
import { TrackingEventId } from '../tracking-event-id';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('TrackingEventId', () => {
  it('debe crear un tracking event ID válido con UUID específico', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const trackingEventId = new TrackingEventId(validUuid);
    expect(trackingEventId.value).toBe(validUuid);
  });

  it('debe heredar de Uuid', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const trackingEventId = new TrackingEventId(validUuid);
    expect(trackingEventId).toBeInstanceOf(Uuid);
  });

  it('debe lanzar error para UUID con formato inválido', () => {
    expect(() => {
      new TrackingEventId('invalid-uuid');
    }).toThrow('Invalid Uuid format');
  });

  it('debe lanzar error para UUID vacío', () => {
    expect(() => {
      new TrackingEventId('');
    }).toThrow('Invalid Uuid format');
  });

  it('debe comparar correctamente dos tracking event IDs iguales', () => {
    const uuidValue = '123e4567-e89b-12d3-a456-426614174000';
    const trackingEventId1 = new TrackingEventId(uuidValue);
    const trackingEventId2 = new TrackingEventId(uuidValue);

    expect(trackingEventId1.equals(trackingEventId2)).toBe(true);
  });

  it('debe comparar correctamente dos tracking event IDs diferentes', () => {
    const trackingEventId1 = new TrackingEventId(
      '123e4567-e89b-12d3-a456-426614174000',
    );
    const trackingEventId2 = new TrackingEventId(
      '987fcdeb-51a2-43d1-9f33-426614174111',
    );

    expect(trackingEventId1.equals(trackingEventId2)).toBe(false);
  });

  it('debe validar correctamente el formato UUID', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(() => {
      new TrackingEventId(validUuid);
    }).not.toThrow();
  });

  it('debe heredar métodos de Uuid', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const trackingEventId = new TrackingEventId(validUuid);

    expect(typeof trackingEventId.equals).toBe('function');
    expect(typeof trackingEventId.getValue).toBe('function');
    expect(trackingEventId.getValue()).toBe(validUuid);
  });
});
