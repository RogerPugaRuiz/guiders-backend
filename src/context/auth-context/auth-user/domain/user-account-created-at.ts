import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class UserAccountCreatedAt extends PrimitiveValueObject<Date> {
  private constructor(value: Date) {
    super(value);
  }

  public static create(value: Date): UserAccountCreatedAt {
    return new UserAccountCreatedAt(value);
  }
}
