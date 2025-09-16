import { PrimitiveValueObject } from '../../../shared/domain/primitive-value-object';

/**
 * Value Object para el fingerprint único del visitante
 * Identificador único basado en características del navegador
 */
export class VisitorFingerprint extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      (val: string) => VisitorFingerprint.validate(val),
      'El fingerprint del visitante debe ser una cadena no vacía',
    );
  }

  private static validate(value: string): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  public getValue(): string {
    return this.value;
  }
}
