import { UuidValueObject } from 'src/context/shared/domain/uuid-value-object';

export class UserAccountId extends UuidValueObject {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): UserAccountId {
    return new UserAccountId(value);
  }
}
