import { IEvent } from '@nestjs/cqrs';

export class ParticipantAssignedEvent implements IEvent {
  constructor(
    readonly chatId: string,
    readonly participantId: string,
    readonly participantName: string,
    readonly isCommercial: boolean,
    readonly isVisitor: boolean,
    readonly assignedAt: Date = new Date(),
    readonly lastSeenAt: Date | null = null,
  ) {}
}
