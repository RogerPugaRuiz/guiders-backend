import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { OpenChatViewCommand } from './open-chat-view.command';
import {
  IChatRepository,
  CHAT_V2_REPOSITORY,
} from '../../domain/chat.repository';
import { ChatId } from '../../domain/value-objects/chat-id';
import { ChatViewOpenedEvent } from '../../domain/events/chat-view-opened.event';

/**
 * Error específico para apertura de vista de chat
 */
export class OpenChatViewError extends DomainError {
  constructor(message: string) {
    super(`Error al abrir vista del chat: ${message}`);
    this.name = 'OpenChatViewError';
  }
}

/**
 * Command handler que procesa la apertura de la vista del chat
 *
 * Flujo:
 * 1. Valida que el chat existe
 * 2. Valida que el usuario tiene acceso al chat
 * 3. Emite ChatViewOpenedEvent para notificar a otros usuarios
 */
@CommandHandler(OpenChatViewCommand)
export class OpenChatViewCommandHandler
  implements
    ICommandHandler<OpenChatViewCommand, Result<void, OpenChatViewError>>
{
  private readonly logger = new Logger(OpenChatViewCommandHandler.name);

  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: OpenChatViewCommand,
  ): Promise<Result<void, OpenChatViewError>> {
    try {
      // Determinar el rol efectivo para logging y evento
      const isVisitor = command.userRoles.includes('visitor');
      const effectiveRole: 'visitor' | 'commercial' = isVisitor
        ? 'visitor'
        : 'commercial';

      this.logger.log(
        `Procesando apertura de vista del chat ${command.chatId} por ${effectiveRole} ${command.userId}`,
      );

      // 1. Buscar el chat
      const chatId = ChatId.create(command.chatId);
      const chatResult = await this.chatRepository.findById(chatId);

      if (chatResult.isErr()) {
        this.logger.error(`Chat no encontrado: ${command.chatId}`);
        return err(new OpenChatViewError('Chat no encontrado'));
      }

      const chat = chatResult.value;

      // 2. Validar acceso según rol
      if (isVisitor) {
        // Los visitantes solo pueden ver sus propios chats
        if (chat.visitorId.getValue() !== command.userId) {
          this.logger.error(
            `Visitante ${command.userId} no tiene acceso al chat ${command.chatId}`,
          );
          return err(new OpenChatViewError('No tienes acceso a este chat'));
        }
      }
      // Los comerciales pueden ver cualquier chat (validación adicional se puede hacer aquí)

      // 3. Emitir evento de apertura de vista
      const now = command.timestamp ? new Date(command.timestamp) : new Date();

      this.eventBus.publish(
        new ChatViewOpenedEvent({
          view: {
            chatId: command.chatId,
            userId: command.userId,
            userRole: effectiveRole,
            openedAt: now,
          },
        }),
      );

      this.logger.log(
        `Vista del chat ${command.chatId} abierta exitosamente por ${effectiveRole} ${command.userId}`,
      );

      return ok(undefined);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error inesperado: ${errorMessage}`);
      return err(new OpenChatViewError(errorMessage));
    }
  }
}
