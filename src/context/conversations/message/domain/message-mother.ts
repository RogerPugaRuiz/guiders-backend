import { Message } from './message';
import { MessageId } from './value-objects/message-id';
import { SenderId } from './value-objects/sender-id';
import { Content } from './value-objects/content';
import { CreatedAt } from './value-objects/created-at';
import { faker } from '@faker-js/faker';
import { ChatId } from '../../chat/domain/chat/value-objects/chat-id';

export class MessageMother {
  public static random(): Message {
    return Message.fromPrimitives({
      id: MessageId.random().value,
      chatId: ChatId.random().value,
      senderId: SenderId.random().value,
      content: Content.create(faker.lorem.sentence()).value,
      createdAt: CreatedAt.create(faker.date.past()).value,
    });
  }

  public static create(params?: {
    id?: string;
    chatId?: string;
    senderId?: string;
    content?: string;
    createdAt?: Date;
  }): Message {
    return Message.fromPrimitives({
      id: params?.id ?? MessageId.random().value,
      chatId: params?.chatId ?? ChatId.random().value,
      senderId: params?.senderId ?? SenderId.random().value,
      content: params?.content ?? Content.create(faker.lorem.sentence()).value,
      createdAt: params?.createdAt ?? CreatedAt.create(faker.date.past()).value,
    });
  }
}
