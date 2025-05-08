import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import { validateStringNotEmpty } from 'src/context/shared/domain/validation-utils';

// Objeto de valor para el teléfono del visitante
// Valida que el teléfono no sea vacío (puedes extender para validación específica)
export class VisitorTel extends PrimitiveValueObject<string> {
  constructor(value: string) {
    validateStringNotEmpty(value);
    super(value);
  }
}
