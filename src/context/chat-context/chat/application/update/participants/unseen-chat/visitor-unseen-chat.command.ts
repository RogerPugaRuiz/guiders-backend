import { ICommand } from '@nestjs/cqrs';

export class VisitorUnseenChatCommand implements ICommand {
  constructor(
    readonly params: {
      chatId: string;
      visitorId: string;
      unseenAt: Date;
    },
  ) {}
}
