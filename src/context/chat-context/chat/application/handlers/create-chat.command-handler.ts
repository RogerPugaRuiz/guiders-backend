import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateChatCommand } from '../commands/create-chat.command';
import { CreateChatUseCase } from '../usecases/create-chat.usecase';
import { Logger } from '@nestjs/common';

@CommandHandler(CreateChatCommand)
export class CreateChatCommandHandler
  implements ICommandHandler<CreateChatCommand>
{
  private logger = new Logger('CreateChatHandler');
  constructor(private readonly service: CreateChatUseCase) {}

  async execute(command: CreateChatCommand): Promise<void> {
    this.logger.log(`Command received: ${command.constructor.name}`);
    await this.service.execute(command);
  }
}
