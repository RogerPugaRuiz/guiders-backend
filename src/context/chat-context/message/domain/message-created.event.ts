import { IEvent } from '@nestjs/cqrs';

export class MessageCreatedEvent implements IEvent {
  constructor(
    public readonly messageId: string, // valor primitivo obtenido de MessageId
    public readonly chatId: string, // valor primitivo obtenido de ChatId
    public readonly senderId: string, // valor primitivo obtenido de SenderId
    public readonly content: string, // valor primitivo obtenido de Content
    public readonly createdAt: Date, // valor primitivo obtenido de CreatedAt
  ) {}
}
