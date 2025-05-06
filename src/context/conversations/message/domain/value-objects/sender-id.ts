import { UuidValueObject } from '../../../../shared/domain/uuid-value-object';

export class SenderId extends UuidValueObject {
  constructor(value: string) {
    super(value);
  }
}
