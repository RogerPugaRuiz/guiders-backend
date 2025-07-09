import { IEvent } from '@nestjs/cqrs';

export class ComercialClaimCreatedEvent implements IEvent {
  constructor(
    public readonly id: string,
    public readonly chatId: string,
    public readonly comercialId: string,
    public readonly claimedAt: Date,
  ) {}
}
