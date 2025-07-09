import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ClaimedAt extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(value);
  }

  static now(): ClaimedAt {
    return new ClaimedAt(new Date());
  }
}
