// Value Object para el nombre del administrador
import { PrimitiveValueObject } from '../../../shared/domain/primitive-value-object';

// Encapsula el nombre del administrador y su validación
export class AdminName extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      (v) => !!v && v.length > 0,
      'El nombre del administrador no puede estar vacío',
    );
  }
}
