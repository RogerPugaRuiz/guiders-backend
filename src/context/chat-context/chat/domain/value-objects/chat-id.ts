import { UuidValueObject } from '../../../../shared/domain/uuid-value-object';

export class ChatId extends UuidValueObject {
  static create(value: string): ChatId {
    return new ChatId(value);
  }
}
