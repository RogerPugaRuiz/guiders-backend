import { UuidValueObject } from '../../../../../shared/domain/uuid-value-object';

export class MessageId extends UuidValueObject {
  private constructor(value: string) {
    super(value);
  }

  public static create(value?: string): MessageId {
    if (value) {
      return new MessageId(value);
    }
    return new MessageId(UuidValueObject.generate());
  }
}
