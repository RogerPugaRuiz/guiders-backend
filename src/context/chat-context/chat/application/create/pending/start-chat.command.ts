import { ICommand } from '@nestjs/cqrs';

export class StartChatCommand implements ICommand {
  constructor(
    public readonly chatId: string,
    public readonly visitorId: string,
    public readonly visitorName: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
