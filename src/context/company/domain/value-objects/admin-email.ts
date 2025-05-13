// Value Object para el email del administrador
import { PrimitiveValueObject } from '../../../shared/domain/primitive-value-object';

// Encapsula el email del administrador. Permite null para ausencia.
export class AdminEmail extends PrimitiveValueObject<string | null> {
  constructor(value: string | null) {
    super(
      value,
      (v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
      'El email del administrador no es válido',
    );
  }
}
