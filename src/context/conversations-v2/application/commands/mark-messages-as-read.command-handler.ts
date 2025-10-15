import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { MarkMessagesAsReadCommand } from './mark-messages-as-read.command';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from '../../domain/message.repository';

/**
 * Handler para marcar mensajes como leídos
 * Actualiza el estado de lectura de uno o más mensajes
 */
@CommandHandler(MarkMessagesAsReadCommand)
export class MarkMessagesAsReadCommandHandler
  implements ICommandHandler<MarkMessagesAsReadCommand>
{
  private readonly logger = new Logger(MarkMessagesAsReadCommandHandler.name);

  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: MessageRepository,
  ) {}

  async execute(
    command: MarkMessagesAsReadCommand,
  ): Promise<{ success: boolean; markedCount: number }> {
    this.logger.log(
      `Marcando ${command.messageIds.length} mensajes como leídos por usuario ${command.readBy}`,
    );

    try {
      const result = await this.messageRepository.markAsRead(
        command.messageIds,
        command.readBy,
      );

      if (result.isErr()) {
        this.logger.error(
          `Error al marcar mensajes como leídos: ${result.error.message}`,
        );
        return { success: false, markedCount: 0 };
      }

      const markedCount = result.unwrap();

      this.logger.log(`${markedCount} mensajes marcados como leídos`);

      return { success: true, markedCount };
    } catch (error) {
      this.logger.error(
        `Error inesperado al marcar mensajes como leídos:`,
        error,
      );
      return { success: false, markedCount: 0 };
    }
  }
}
