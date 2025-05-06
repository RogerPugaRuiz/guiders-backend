import { UuidValueObject } from 'src/context/shared/domain/uuid-value-object';

export class ChatId extends UuidValueObject {
  static create(value?: string): ChatId {
    if (!value) {
      return ChatId.random();
    }
    return new ChatId(value);
  }
}
