import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ReleasedAt extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(value);
  }

  static now(): ReleasedAt {
    return new ReleasedAt(new Date());
  }
}
