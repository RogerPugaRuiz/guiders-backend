import { PrimitiveValueObject } from '../primitive-value-object';
import { validateEmail } from '../validation-utils';
// Clase para representar una dirección de correo electrónico como un objeto de valor.
export class Email extends PrimitiveValueObject<string> {
  // Constructor que recibe el valor del correo electrónico.
  // Valida que el correo electrónico tenga un formato válido.
  constructor(value: string) {
    super(value, validateEmail, 'Email must be a valid email address');
  }
}
