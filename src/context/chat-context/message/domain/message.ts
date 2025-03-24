import { AggregateRoot } from '@nestjs/cqrs';
import { MessageId } from './message-id';
import { ChatId } from './chat-id';
import { SenderId } from './sender-id';
import { Content } from './content';
import { CreatedAt } from './created-at';
import { MessageCreatedEvent } from './message-created.event';

export interface MessagePrimitives {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: Date;
}

export class Message extends AggregateRoot {
  private constructor(
    readonly id: MessageId,
    readonly chatId: ChatId,
    readonly senderId: SenderId,
    readonly content: Content,
    readonly createdAt: CreatedAt,
  ) {
    super();
  }

  public static fromPrimitives(params: MessagePrimitives): Message {
    return new Message(
      MessageId.create(params.id),
      ChatId.create(params.chatId),
      SenderId.create(params.senderId),
      Content.create(params.content),
      CreatedAt.create(params.createdAt),
    );
  }

  public static createNewMessage(params: {
    chatId: ChatId;
    senderId: SenderId;
    content: Content;
  }): Message {
    const id = MessageId.random();
    const createdAt = CreatedAt.now();
    const message = new Message(
      id,
      params.chatId,
      params.senderId,
      params.content,
      createdAt,
    );
    // Se aplica el evento de dominio
    message.apply(
      new MessageCreatedEvent(
        id.value,
        params.chatId.value,
        params.senderId.value,
        params.content.value,
        createdAt.value,
      ),
    );
    return message;
  }
}
