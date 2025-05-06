import { IEvent } from '@nestjs/cqrs';
import { ChatPrimitives } from '../chat';

export class StatusUpdatedEvent implements IEvent {
  constructor(
    public readonly params: {
      timestamp: Date;
      attributes: {
        chat: ChatPrimitives;
        oldStatus: string;
      };
    },
  ) {}
}
