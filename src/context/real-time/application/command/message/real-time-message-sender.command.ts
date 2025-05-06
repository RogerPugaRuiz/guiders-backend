import { IEvent } from '@nestjs/cqrs';

export class RealTimeMessageSenderCommand implements IEvent {
  constructor(
    readonly id: string,
    readonly chatId: string,
    readonly senderId: string,
    readonly message: string,
    readonly createdAt: Date,
  ) {}
}
