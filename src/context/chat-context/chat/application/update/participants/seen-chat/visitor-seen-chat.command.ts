import { ICommand } from '@nestjs/cqrs';

export class VisitorSeenChatCommand implements ICommand {
  constructor(
    readonly params: {
      chatId: string;
      visitorId: string;
      seenAt: Date;
    },
  ) {}
}
