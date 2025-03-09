import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class UserAccountUpdatedAt extends PrimitiveValueObject<Date> {
  private constructor(value: Date) {
    super(value);
  }

  public static create(value: Date): UserAccountUpdatedAt {
    return new UserAccountUpdatedAt(value);
  }
}
