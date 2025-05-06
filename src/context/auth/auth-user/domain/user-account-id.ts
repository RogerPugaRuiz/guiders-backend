import { UuidValueObject } from 'src/context/shared/domain/uuid-value-object';

export class UserAccountId extends UuidValueObject {
  constructor(value: string) {
    super(value);
  }
}
