import { ICommand } from '@nestjs/cqrs';

export class ReleaseChatClaimCommand implements ICommand {
  constructor(
    public readonly chatId: string,
    public readonly comercialId: string,
  ) {}
}
