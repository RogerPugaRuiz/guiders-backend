import { IEvent } from '@nestjs/cqrs';

export class RealTimeMessageSenderCommand implements IEvent {
  constructor(
    readonly chatId: string,
    readonly senderId: string,
    readonly message: string,
    readonly createdAt: Date,
  ) {}
}
