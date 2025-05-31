// Prueba unitaria para IntentConfidence
// Ubicación: src/context/tracking/domain/value-objects/__tests__/intent-confidence.spec.ts
import { IntentConfidence } from '../intent-confidence';

describe('IntentConfidence', () => {
  it('debe crear confianza HIGH', () => {
    const confidence = new IntentConfidence(IntentConfidence.HIGH);
    expect(confidence.value).toBe('HIGH');
  });

  it('debe crear confianza MEDIUM', () => {
    const confidence = new IntentConfidence(IntentConfidence.MEDIUM);
    expect(confidence.value).toBe('MEDIUM');
  });

  it('debe crear confianza LOW', () => {
    const confidence = new IntentConfidence(IntentConfidence.LOW);
    expect(confidence.value).toBe('LOW');
  });

  it('debe tener constantes estáticas definidas', () => {
    expect(IntentConfidence.HIGH).toBe('HIGH');
    expect(IntentConfidence.MEDIUM).toBe('MEDIUM');
    expect(IntentConfidence.LOW).toBe('LOW');
  });

  it('debe lanzar error para nivel inválido', () => {
    expect(() => {
      new IntentConfidence('INVALID_LEVEL');
    }).toThrow('El nivel de confianza debe ser HIGH, MEDIUM o LOW');
  });

  it('debe lanzar error para nivel vacío', () => {
    expect(() => {
      new IntentConfidence('');
    }).toThrow('El nivel de confianza debe ser HIGH, MEDIUM o LOW');
  });

  it('debe ser case sensitive', () => {
    expect(() => {
      new IntentConfidence('high');
    }).toThrow('El nivel de confianza debe ser HIGH, MEDIUM o LOW');
  });

  it('debe comparar correctamente dos niveles iguales', () => {
    const conf1 = new IntentConfidence(IntentConfidence.HIGH);
    const conf2 = new IntentConfidence(IntentConfidence.HIGH);

    expect(conf1.equals(conf2)).toBe(true);
  });

  it('debe comparar correctamente dos niveles diferentes', () => {
    const conf1 = new IntentConfidence(IntentConfidence.HIGH);
    const conf2 = new IntentConfidence(IntentConfidence.LOW);

    expect(conf1.equals(conf2)).toBe(false);
  });
});
