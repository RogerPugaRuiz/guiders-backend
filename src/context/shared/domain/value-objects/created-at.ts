import { PrimitiveValueObject } from '../primitive-value-object';
import { validateDate } from '../validation-utils';

const validateCreatedAt = validateDate;

export class CreatedAt extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(value, validateCreatedAt, 'CreatedAt must be a valid date');
  }
}
