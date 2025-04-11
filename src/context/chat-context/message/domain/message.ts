import { MessageId } from './value-objects/message-id';
import { SenderId } from './value-objects/sender-id';
import { Content } from './value-objects/content';
import { CreatedAt } from './value-objects/created-at';
import { ChatId } from '../../chat/domain/chat/value-objects/chat-id';

export interface MessagePrimitives {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: number;
}

export class Message {
  private constructor(
    readonly id: MessageId,
    readonly chatId: ChatId,
    readonly senderId: SenderId,
    readonly content: Content,
    readonly createdAt: CreatedAt,
  ) {}

  public static fromPrimitives(params: {
    id: string;
    chatId: string;
    senderId: string;
    content: string;
    createdAt: number | Date | string;
  }): Message {
    return new Message(
      MessageId.create(params.id),
      ChatId.create(params.chatId),
      SenderId.create(params.senderId),
      Content.create(params.content),
      CreatedAt.create(params.createdAt),
    );
  }

  public static create(params: {
    chatId: ChatId;
    senderId: SenderId;
    content: Content;
    createdAt?: CreatedAt;
  }): Message {
    const id = MessageId.random();
    const createdAt = params.createdAt
      ? CreatedAt.create(params.createdAt.value)
      : CreatedAt.create(new Date());
    const message = new Message(
      id,
      params.chatId,
      params.senderId,
      params.content,
      createdAt,
    );
    return message;
  }

  public toPrimitives(): MessagePrimitives {
    return {
      id: this.id.value,
      chatId: this.chatId.value,
      senderId: this.senderId.value,
      content: this.content.value,
      createdAt: this.createdAt.value.getTime(),
    };
  }
}
