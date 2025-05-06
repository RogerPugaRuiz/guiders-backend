import { IEvent } from '@nestjs/cqrs';
import { ChatPrimitives } from '../chat';
import { MessagePrimitives } from 'src/context/chat-context/message/domain/message';

export class ChatUpdatedWithNewMessageEvent implements IEvent {
  constructor(
    readonly params: {
      timestamp: Date;
      attributes: {
        chat: ChatPrimitives;
        message: MessagePrimitives;
      };
    },
  ) {}
}
