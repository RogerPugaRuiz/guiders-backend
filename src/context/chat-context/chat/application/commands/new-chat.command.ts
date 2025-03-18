import { ICommand } from '@nestjs/cqrs';
export class NewChatCommand implements ICommand {
  constructor(public readonly visitorId: string) {}
}
