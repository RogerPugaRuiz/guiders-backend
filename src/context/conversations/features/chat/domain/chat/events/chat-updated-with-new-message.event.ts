import { MessagePrimitives } from 'src/context/conversations/message/domain/message';
import { DomainEvent } from 'src/context/shared/domain/domain-event';
import { ChatPrimitives } from '../chat';

export class ChatUpdatedWithNewMessageEvent extends DomainEvent<{
  message: MessagePrimitives;
  chat: ChatPrimitives;
}> {
  constructor(params: { message: MessagePrimitives; chat: ChatPrimitives }) {
    super({
      ...params,
    });
  }
}
