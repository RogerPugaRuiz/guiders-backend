import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class UserAccountUpdatedAt extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(value);
  }
}
