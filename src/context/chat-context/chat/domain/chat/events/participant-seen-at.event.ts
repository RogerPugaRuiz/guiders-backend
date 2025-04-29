import { IEvent } from '@nestjs/cqrs';

export class ParticipantSeenAtEvent implements IEvent {
  constructor(
    public readonly params: {
      attributes: {
        id: string;
        seenAt: Date;
        chatId: string;
      };
      timestamp: number;
    },
  ) {}
}
