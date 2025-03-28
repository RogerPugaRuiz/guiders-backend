/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Message } from './message';
import { MessageId } from './value-objects/message-id';
import { SenderId } from './value-objects/sender-id';
import { Content } from './value-objects/content';
import { CreatedAt } from './value-objects/created-at';
import { faker } from '@faker-js/faker';
import { ChatId } from '../chat/value-objects/chat-id';

export class MessageMother {
  public static random(): Message {
    return Message.fromPrimitives({
      id: MessageId.create().value,
      chatId: ChatId.create().value,
      senderId: SenderId.create().value,
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
      id: MessageId.create(params?.id).value,
      chatId: ChatId.create(params?.chatId).value,
      senderId: SenderId.create(params?.senderId).value,
      content: params?.content ?? Content.create(faker.lorem.sentence()).value,
      createdAt: params?.createdAt ?? CreatedAt.create(faker.date.past()).value,
    });
  }
}
