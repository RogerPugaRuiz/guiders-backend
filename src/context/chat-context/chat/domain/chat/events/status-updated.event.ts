import { IEvent } from '@nestjs/cqrs';

export class StatusUpdatedEvent implements IEvent {
  constructor(
    public readonly chatId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
