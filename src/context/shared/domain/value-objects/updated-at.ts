import { PrimitiveValueObject } from '../primitive-value-object';
import { validateDate } from '../validation-utils';

const validateUpdatedAt = validateDate;

export class UpdatedAt extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(value, validateUpdatedAt, 'UpdatedAt must be a valid date');
  }
}
