import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class UserAccountPassword extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  public static create(value: string): UserAccountPassword {
    return new UserAccountPassword(value);
  }
}
