import { PrimitiveValueObject } from '../../../../../shared/domain/primitive-value-object';

export class VistorLastReadAt extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(value, (v) => v instanceof Date, 'Invalid Visitor Last Read At');
  }
}
