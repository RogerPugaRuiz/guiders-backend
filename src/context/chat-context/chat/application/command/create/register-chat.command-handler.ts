import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterChatCommand } from './register-chat.command';
import { okVoid, Result } from 'src/context/shared/domain/result';
import { RegisterChatError } from '../../../domain/chat/errors/errors';
import { Inject } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../domain/chat.repository';

export type RegisterChatResponse = Result<void, RegisterChatError>;

@CommandHandler(RegisterChatCommand)
export class RegisterChatCommandHandler
  implements ICommandHandler<RegisterChatCommand, RegisterChatResponse>
{
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly chatRepository: IChatRepository,
  ) {}
  async execute(command: RegisterChatCommand): Promise<RegisterChatResponse> {
    throw new Error('Method not implemented.');
    return Promise.resolve(okVoid());
  }
}
