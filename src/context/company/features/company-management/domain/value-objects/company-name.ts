// Value Object para el nombre de la empresa
import { PrimitiveValueObject } from '../../../shared/domain/primitive-value-object';

// Encapsula el nombre de la empresa y su validación
export class CompanyName extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      (v) => !!v && v.length > 0,
      'El nombre de la empresa no puede estar vacío',
    );
  }
}
