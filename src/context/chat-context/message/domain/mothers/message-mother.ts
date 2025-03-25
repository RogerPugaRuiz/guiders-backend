import { Message } from '../message';
import { MessageId } from '../value-objects/message-id';
import { ChatId } from '../value-objects/chat-id';
import { SenderId } from '../value-objects/sender-id';
import { Content } from '../value-objects/content';
import { CreatedAt } from '../value-objects/created-at';

export class MessageMother {
  public static random(): Message {
    return Message.fromPrimitives({
      id: MessageId.create().value,
      chatId: ChatId.create().value,
      senderId: SenderId.create().value,
      content: Content.create('Contenido de prueba').value,
      createdAt: CreatedAt.create(new Date()).value,
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
      content: params?.content ?? Content.create('Contenido de prueba').value,
      createdAt: params?.createdAt ?? CreatedAt.create(new Date()).value,
    });
  }
}
