// Value Object para el teléfono del administrador
import { PrimitiveValueObject } from '../../../shared/domain/primitive-value-object';

// Encapsula el teléfono del administrador. Permite null para ausencia.
export class AdminTel extends PrimitiveValueObject<string | null> {
  constructor(value: string | null) {
    super(
      value,
      (v) => v === null || /^[0-9]{9}$/.test(v),
      'El teléfono del administrador no es válido',
    );
  }
}
