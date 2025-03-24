import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NewMessageCommand } from '../commands/new-message.command';
import { NewMessageUseCase } from '../usecases/new-message.usecase';

@CommandHandler(NewMessageCommand)
export class NewMessageCommandHandler
  implements ICommandHandler<NewMessageCommand>
{
  constructor(private readonly service: NewMessageUseCase) {}
  async execute(command: NewMessageCommand) {
    await this.service.execute(command);
  }
}
