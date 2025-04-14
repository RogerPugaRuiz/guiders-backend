import { PrimitiveValueObject } from '../primitive-value-object';
import { validateEmail } from '../validation-utils';

const validateMail = validateEmail;

export class Mail extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value, validateMail, 'Mail must be a valid email address');
  }
}
