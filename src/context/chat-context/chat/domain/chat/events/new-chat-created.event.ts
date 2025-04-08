import { IEvent } from '@nestjs/cqrs';

export class NewChatCreatedEvent implements IEvent {
  constructor(
    public readonly chatId: string,
    public readonly participants: {
      id: string;
      name: string;
      isCommercial: boolean;
      isVisitor: boolean;
    }[],
    public readonly status: string,
    public readonly createdAt: Date,
    public readonly timestamp: Date = new Date(),
  ) {}
}
