import { ICommand } from '@nestjs/cqrs';

export class NewMessageCommand implements ICommand {
  constructor(
    public readonly chatId: string,
    public readonly senderId: string,
    public readonly content: string,
    public readonly createdAt: Date,
  ) {}
}
