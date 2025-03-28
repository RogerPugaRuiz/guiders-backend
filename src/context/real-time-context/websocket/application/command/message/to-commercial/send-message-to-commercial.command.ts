import { ICommand } from '@nestjs/cqrs';

export class SendMessageToCommercialCommand implements ICommand {
  constructor(
    readonly chatId: string,
    readonly from: string,
    readonly to: string,
    readonly message: string,
    readonly timestamp: Date,
  ) {}

  public static create(params: {
    chatId: string;
    from: string;
    to: string;
    message: string;
    timestamp: Date;
  }): SendMessageToCommercialCommand {
    return new SendMessageToCommercialCommand(
      params.chatId,
      params.from,
      params.to,
      params.message,
      params.timestamp,
    );
  }
}
