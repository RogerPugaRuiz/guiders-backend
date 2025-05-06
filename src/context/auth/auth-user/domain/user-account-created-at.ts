import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class UserAccountCreatedAt extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(value);
  }
}
