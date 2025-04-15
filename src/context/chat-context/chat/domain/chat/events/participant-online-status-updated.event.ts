import { IEvent } from '@nestjs/cqrs';
import { ChatPrimitives } from '../chat';

export class ParticipantOnlineStatusUpdatedEvent implements IEvent {
  constructor(
    public readonly attributes: {
      updatedParticipant: {
        id: string;
        isOnline: boolean;
      };
      chat: ChatPrimitives;
    },
    public readonly timestamp: Date = new Date(),
  ) {}
}
