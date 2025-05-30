import { PrimitiveValueObject } from '../../../../../shared/domain/primitive-value-object';

export class LastMessageAt extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(
      value,
      (v) => v instanceof Date && !isNaN(v.getTime()),
      'Invalid Last Message At',
    );
  }
}
