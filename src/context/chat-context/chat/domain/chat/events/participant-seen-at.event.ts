import { IEvent } from '@nestjs/cqrs';
import { ChatPrimitives } from '../chat';

export class ParticipantSeenAtEvent implements IEvent {
  constructor(
    public readonly params: {
      attributes: {
        participantUpdate: {
          id: string;
          previousSeen: Date | null;
          previousIsViewing: boolean;
        };
        chat: ChatPrimitives;
      };
      timestamp: number;
    },
  ) {}
}
