import { UuidValueObject } from '../../../../shared/domain/uuid-value-object';

export class MessageId extends UuidValueObject {
  constructor(value: string) {
    super(value);
  }
}
