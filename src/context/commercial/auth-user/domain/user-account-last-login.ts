import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class UserAccountLastLogin extends PrimitiveValueObject<Date> {
  private constructor(value: Date) {
    super(value);
  }

  public static create(value: Date): UserAccountLastLogin {
    return new UserAccountLastLogin(value);
  }
}
