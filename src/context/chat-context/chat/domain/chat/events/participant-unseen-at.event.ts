import { IEvent } from '@nestjs/cqrs';

export class ParticipantUnseenAtEvent implements IEvent {
  constructor(
    public readonly params: {
      attributes: {
        id: string;
        unseenAt: Date;
        chatId: string;
      };
      timestamp: number;
    },
  ) {}
}
