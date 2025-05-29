import { IEvent } from '@nestjs/cqrs';
import { ChatPrimitives, ParticipantPrimitives } from '../chat';

export class ParticipantUnassignedEvent implements IEvent {
  constructor(
    readonly attributes: {
      chat: ChatPrimitives;
      removedParticipant: ParticipantPrimitives;
    },
    readonly timestamp: Date = new Date(),
  ) {}
}
