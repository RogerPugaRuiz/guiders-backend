import { IEvent } from '@nestjs/cqrs';
import { ChatPrimitives, ParticipantPrimitives } from '../chat';

export class ParticipantAssignedEvent implements IEvent {
  constructor(
    readonly attributes: {
      chat: ChatPrimitives;
      newParticipant: ParticipantPrimitives;
    },
    readonly timestamp: Date = new Date(),
  ) {}
}
