import { UuidValueObject } from '../../../shared/domain/uuid-value-object';

export class ChatId extends UuidValueObject {
  private constructor(value: string) {
    super(value);
  }

  public static create(value?: string): ChatId {
    if (value) {
      return new ChatId(value);
    }
    return new ChatId(UuidValueObject.generate());
  }
}
