import { ICommand } from '@nestjs/cqrs';
export class CreateChatCommand implements ICommand {
  constructor(public readonly visitorId: string) {}
}
