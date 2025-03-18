import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NewChatCommand } from '../commands/new-chat.command';
import { NewChatUseCase } from '../usecases/new-chat.usecase';
import { Logger } from '@nestjs/common';

@CommandHandler(NewChatCommand)
export class NewChatCommandHandler implements ICommandHandler<NewChatCommand> {
  private logger = new Logger('CreateChatHandler');
  constructor(private readonly service: NewChatUseCase) {}

  async execute(command: NewChatCommand): Promise<void> {
    this.logger.log(`Command received: ${command.constructor.name}`);
    await this.service.execute(command);
  }
}
