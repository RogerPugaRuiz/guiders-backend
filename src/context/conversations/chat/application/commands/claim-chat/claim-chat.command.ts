import { ICommand } from '@nestjs/cqrs';

export class ClaimChatCommand implements ICommand {
  constructor(
    public readonly chatId: string,
    public readonly comercialId: string,
  ) {}
}
