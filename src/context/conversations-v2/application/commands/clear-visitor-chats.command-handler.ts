import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import {
  ClearVisitorChatsCommand,
  ClearVisitorChatsResult,
} from './clear-visitor-chats.command';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from '../../domain/chat.repository';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

/**
 * Handler para ClearVisitorChatsCommand
 */
@CommandHandler(ClearVisitorChatsCommand)
export class ClearVisitorChatsCommandHandler
  implements ICommandHandler<ClearVisitorChatsCommand, ClearVisitorChatsResult>
{
  private readonly logger = new Logger(ClearVisitorChatsCommandHandler.name);

  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async execute(
    command: ClearVisitorChatsCommand,
  ): Promise<ClearVisitorChatsResult> {
    this.logger.log(
      `Eliminando chats del visitante ${command.visitorId} (solicitado por ${command.deletedBy})`,
    );

    const visitorId = VisitorId.create(command.visitorId);
    const deleteResult: Result<number, DomainError> =
      await this.chatRepository.deleteByVisitorId(visitorId);

    if (deleteResult.isErr()) {
      const error = deleteResult.error;
      this.logger.error(
        `Error eliminando chats de visitante ${command.visitorId}: ${error.message}`,
      );
      throw error; // Traducido arriba a HttpException si es necesario
    }

    const deletedCount = deleteResult.unwrap();
    this.logger.log(
      `Eliminados ${deletedCount} chats del visitante ${command.visitorId}`,
    );

    return {
      visitorId: command.visitorId,
      deletedCount,
    };
  }
}
