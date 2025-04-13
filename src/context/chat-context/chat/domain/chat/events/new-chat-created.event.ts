import { IEvent } from '@nestjs/cqrs';
import { ChatPrimitives } from '../chat';

export class NewChatCreatedEvent implements IEvent {
  constructor(
    public readonly atributes: {
      chat: ChatPrimitives;
      publisherId: string;
    },
    public readonly timestamp: Date = new Date(),
  ) {}
}
