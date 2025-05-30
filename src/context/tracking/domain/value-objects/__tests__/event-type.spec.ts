// Prueba unitaria para EventType
// Ubicación: src/context/tracking/domain/value-objects/__tests__/event-type.spec.ts
import { EventType } from '../event-type';

describe('EventType', () => {
  it('debe crear tipo de evento válido', () => {
    const eventType = new EventType('page_view');
    expect(eventType.value).toBe('page_view');
  });

  it('debe crear tipo de evento con formato click', () => {
    const eventType = new EventType('button_click');
    expect(eventType.value).toBe('button_click');
  });

  it('debe crear tipo de evento con formato custom', () => {
    const eventType = new EventType('custom_event');
    expect(eventType.value).toBe('custom_event');
  });

  it('debe lanzar error para tipo de evento vacío', () => {
    expect(() => {
      new EventType('');
    }).toThrow('El tipo de evento no puede estar vacío');
  });

  it('debe lanzar error para tipo de evento con solo espacios', () => {
    expect(() => {
      new EventType('   ');
    }).toThrow('El tipo de evento no puede estar vacío');
  });

  it('debe comparar correctamente dos tipos iguales', () => {
    const type1 = new EventType('page_view');
    const type2 = new EventType('page_view');
    
    expect(type1.equals(type2)).toBe(true);
  });

  it('debe comparar correctamente dos tipos diferentes', () => {
    const type1 = new EventType('page_view');
    const type2 = new EventType('button_click');
    
    expect(type1.equals(type2)).toBe(false);
  });
});