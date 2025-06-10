import { IEvent } from '@nestjs/cqrs';
import { ChatPrimitives } from '../chat';

export class ParticipantViewingStatusChangedEvent implements IEvent {
  constructor(
    public readonly params: {
      attributes: {
        chat: ChatPrimitives;
        participantUpdate: {
          id: string;
          previousIsViewing: boolean;
        };
      };
      timestamp: number;
    },
  ) {}
}
