import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { CloseChatViewCommand } from './close-chat-view.command';
import {
  IChatRepository,
  CHAT_V2_REPOSITORY,
} from '../../domain/chat.repository';
import { ChatId } from '../../domain/value-objects/chat-id';
import { ChatViewClosedEvent } from '../../domain/events/chat-view-closed.event';

/**
 * Error específico para cierre de vista de chat
 */
export class CloseChatViewError extends DomainError {
  constructor(message: string) {
    super(`Error al cerrar vista del chat: ${message}`);
    this.name = 'CloseChatViewError';
  }
}

/**
 * Command handler que procesa el cierre de la vista del chat
 *
 * Flujo:
 * 1. Valida que el chat existe
 * 2. Valida que el usuario tiene acceso al chat
 * 3. Emite ChatViewClosedEvent para notificar a otros usuarios
 */
@CommandHandler(CloseChatViewCommand)
export class CloseChatViewCommandHandler
  implements
    ICommandHandler<CloseChatViewCommand, Result<void, CloseChatViewError>>
{
  private readonly logger = new Logger(CloseChatViewCommandHandler.name);

  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: CloseChatViewCommand,
  ): Promise<Result<void, CloseChatViewError>> {
    try {
      this.logger.log(
        `Procesando cierre de vista del chat ${command.chatId} por ${command.userRole} ${command.userId}`,
      );

      // 1. Buscar el chat
      const chatId = ChatId.create(command.chatId);
      const chatResult = await this.chatRepository.findById(chatId);

      if (chatResult.isErr()) {
        this.logger.error(`Chat no encontrado: ${command.chatId}`);
        return err(new CloseChatViewError('Chat no encontrado'));
      }

      const chat = chatResult.value;

      // 2. Validar acceso según rol
      if (command.userRole === 'visitor') {
        // Los visitantes solo pueden cerrar vista de sus propios chats
        if (chat.visitorId.getValue() !== command.userId) {
          this.logger.error(
            `Visitante ${command.userId} no tiene acceso al chat ${command.chatId}`,
          );
          return err(new CloseChatViewError('No tienes acceso a este chat'));
        }
      }
      // Los comerciales pueden cerrar vista de cualquier chat

      // 3. Emitir evento de cierre de vista
      const now = command.timestamp ? new Date(command.timestamp) : new Date();

      this.eventBus.publish(
        new ChatViewClosedEvent({
          view: {
            chatId: command.chatId,
            userId: command.userId,
            userRole: command.userRole,
            closedAt: now,
          },
        }),
      );

      this.logger.log(
        `Vista del chat ${command.chatId} cerrada exitosamente por ${command.userRole} ${command.userId}`,
      );

      return ok(undefined);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error inesperado: ${errorMessage}`);
      return err(new CloseChatViewError(errorMessage));
    }
  }
}
