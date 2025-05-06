import { IEvent } from '@nestjs/cqrs';

export class ChatMessageSendEvent implements IEvent {
  constructor(
    public readonly chatId: string,
    public readonly from: string,
    public readonly to: string,
    public readonly message: string,
    public readonly timestamp: Date,
  ) {}

  public static create(params: {
    chatId: string;
    from: string;
    to: string;
    message: string;
    timestamp: Date;
  }): ChatMessageSendEvent {
    return new ChatMessageSendEvent(
      params.chatId,
      params.from,
      params.to,
      params.message,
      params.timestamp,
    );
  }
}
