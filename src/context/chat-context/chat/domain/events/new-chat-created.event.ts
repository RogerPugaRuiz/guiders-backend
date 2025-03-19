import { IEvent } from '@nestjs/cqrs';

export class NewChatCreatedEvent implements IEvent {
  constructor(
    public readonly chatId: string,
    public readonly commercialId: string | null,
    public readonly visitorId: string,
    public readonly status: string,
    public readonly lastMessage: string | null,
    public readonly lastMessageAt: Date | null,
    public readonly timestamp: Date = new Date(),
  ) {}
}
