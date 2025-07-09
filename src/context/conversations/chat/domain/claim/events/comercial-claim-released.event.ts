import { IEvent } from '@nestjs/cqrs';

export class ComercialClaimReleasedEvent implements IEvent {
  constructor(
    public readonly id: string,
    public readonly chatId: string,
    public readonly comercialId: string,
    public readonly releasedAt: Date,
  ) {}
}
