import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class UserAccountEmail extends PrimitiveValueObject<string> {
  private static readonly EMAIL_REGEX =
    /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;

  constructor(value: string) {
    super(
      value.toLowerCase(),
      (value: string) => UserAccountEmail.EMAIL_REGEX.test(value),
      'Invalid email',
    );
  }

  public static validate(value: string): boolean {
    return UserAccountEmail.EMAIL_REGEX.test(value);
  }
}
