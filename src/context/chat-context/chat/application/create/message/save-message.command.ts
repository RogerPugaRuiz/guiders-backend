import { ICommand } from '@nestjs/cqrs';

export class SaveMessageCommand implements ICommand {
  constructor(
    readonly chatId: string,
    readonly senderId: string,
    readonly message: string,
    readonly createdAt: Date,
  ) {}
}
