import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import { validateStringNotEmpty } from 'src/context/shared/domain/validation-utils';

// Objeto de valor para el nombre del visitante
// Valida que el nombre no sea vacío
export class VisitorName extends PrimitiveValueObject<string> {
  constructor(value: string) {
    validateStringNotEmpty(value);
    super(value);
  }
}
