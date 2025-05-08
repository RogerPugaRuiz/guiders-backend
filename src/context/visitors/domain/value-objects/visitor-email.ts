import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import { validateEmail } from 'src/context/shared/domain/validation-utils';

// Objeto de valor para el email del visitante
// Valida que el email tenga formato correcto
export class VisitorEmail extends PrimitiveValueObject<string> {
  constructor(value: string) {
    validateEmail(value);
    super(value);
  }
}
