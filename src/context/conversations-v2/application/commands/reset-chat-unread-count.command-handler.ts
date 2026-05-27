import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ResetChatUnreadCountCommand } from './reset-chat-unread-count.command';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from '../../domain/chat.repository';
import { ChatId } from '../../domain/value-objects/chat-id';
import { Result, err, ok } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  ChatInvalidIdError,
  ChatNotFoundError,
  ChatTenantMismatchError,
} from '../../domain/errors/chat.error';
import { UnreadCountUpdatedEvent } from '../../domain/events/unread-count-updated.event';

/**
 * Handler para resetear el contador de mensajes no leídos de un chat.
 *
 * Flujo:
 * 1. Recibe el chatId y el companyId del usuario solicitante
 * 2. Valida el formato del chatId (UUID)
 * 3. Busca el chat y verifica que pertenece al mismo tenant (companyId)
 * 4. Llama a resetUnreadCount en el repositorio (operación atómica MongoDB)
 * 5. Publica UnreadCountUpdatedEvent con newCount=0 para notificar via WS
 * 6. Retorna Result<void, DomainError>
 *
 * Se invoca cuando el comercial abre el chat o marca todos los mensajes como leídos,
 * garantizando que el badge del sidebar y la columna de actividad reflejen 0 no leídos.
 */
@CommandHandler(ResetChatUnreadCountCommand)
export class ResetChatUnreadCountCommandHandler
  implements ICommandHandler<ResetChatUnreadCountCommand>
{
  private readonly logger = new Logger(ResetChatUnreadCountCommandHandler.name);

  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: ResetChatUnreadCountCommand,
  ): Promise<Result<void, DomainError>> {
    this.logger.log(
      `Reseteando unreadMessagesCount del chat ${command.chatId} solicitado por ${command.requestedBy}`,
    );

    // Validar formato UUID antes de llegar al repositorio
    let chatId: ChatId;
    try {
      chatId = ChatId.create(command.chatId);
    } catch {
      return err(new ChatInvalidIdError(command.chatId));
    }

    // Verificar que el chat existe y pertenece al tenant del usuario
    const findResult = await this.chatRepository.findById(chatId);
    if (findResult.isErr()) {
      this.logger.warn(
        `Chat ${command.chatId} no encontrado al resetear unread por ${command.requestedBy}`,
      );
      return err(new ChatNotFoundError(command.chatId));
    }

    const chat = findResult.unwrap();
    if (chat.companyId !== command.companyId) {
      this.logger.warn(
        `Acceso denegado: chat ${command.chatId} pertenece a companyId ${chat.companyId}, ` +
          `pero fue solicitado por ${command.requestedBy} de companyId ${command.companyId}`,
      );
      return err(
        new ChatTenantMismatchError(command.chatId, command.requestedBy),
      );
    }

    const result = await this.chatRepository.resetUnreadCount(chatId);

    if (result.isErr()) {
      this.logger.error(
        `Error al resetear unreadMessagesCount del chat ${command.chatId}: ${result.error.message}`,
      );
      return result;
    }

    this.logger.log(
      `unreadMessagesCount reseteado a 0 para chat ${command.chatId}`,
    );

    // Notificar via WebSocket que el contador es 0
    this.eventBus.publish(
      new UnreadCountUpdatedEvent({ chatId: command.chatId, newCount: 0 }),
    );

    return ok(undefined);
  }
}
