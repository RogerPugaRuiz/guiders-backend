import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { MessageSentEvent } from '../../domain/events/message-sent.event';
import { UnreadCountUpdatedEvent } from '../../domain/events/unread-count-updated.event';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from '../../domain/chat.repository';
import {
  MESSAGE_V2_REPOSITORY,
  IMessageRepository,
} from '../../domain/message.repository';
import { ChatId } from '../../domain/value-objects/chat-id';

/**
 * Event handler que actualiza el chat cuando se envía un mensaje
 *
 * Flujo:
 * 1. Escucha el evento MessageSentEvent
 * 2. Obtiene el chat desde el repositorio
 * 3. Actualiza el lastMessageContent, lastMessageDate y totalMessages
 * 4. Incrementa el contador de mensajes no leídos (unreadMessagesCount) de forma atómica
 * 5. Guarda el chat actualizado
 *
 * Patrón: UpdateChatOnMessageSentEventHandler
 */
@EventsHandler(MessageSentEvent)
export class UpdateChatOnMessageSentEventHandler
  implements IEventHandler<MessageSentEvent>
{
  private readonly logger = new Logger(
    UpdateChatOnMessageSentEventHandler.name,
  );

  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject(MESSAGE_V2_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    private readonly eventBus: EventBus,
  ) {}

  async handle(event: MessageSentEvent): Promise<void> {
    const messageData = event.getMessageData();
    const chatId = event.getChatId();

    this.logger.log(
      `Actualizando chat ${chatId} con último mensaje: ${messageData.messageId}`,
    );

    try {
      // Obtener el chat
      const chatResult = await this.chatRepository.findById(
        ChatId.create(chatId),
      );

      if (chatResult.isErr()) {
        this.logger.error(
          `Chat ${chatId} no encontrado: ${chatResult.error.message}`,
        );
        return;
      }

      const chat = chatResult.value;

      // Contar mensajes reales del repositorio
      const countResult = await this.messageRepository.countByChatId(
        ChatId.create(chatId),
      );

      if (countResult.isErr()) {
        this.logger.error(
          `Error al contar mensajes para chat ${chatId}: ${countResult.error.message}`,
        );
        return;
      }

      const totalMessages = countResult.value;

      // Truncar el contenido para preview (máximo 100 caracteres)
      const contentPreview =
        messageData.content.length > 100
          ? `${messageData.content.substring(0, 100)}...`
          : messageData.content;

      // Actualizar el chat con los datos del último mensaje y conteo real
      const updatedChat = chat.updateLastMessage(
        contentPreview,
        messageData.senderId,
        messageData.sentAt,
        totalMessages,
      );

      // Actualizar el chat (usar update, no save, ya que el chat ya existe)
      const saveResult = await this.chatRepository.update(updatedChat);

      if (saveResult.isErr()) {
        this.logger.error(
          `Error al actualizar chat ${chatId}: ${saveResult.error.message}`,
        );
        return;
      }

      // Incrementar el contador de mensajes no leídos de forma atómica.
      // Los mensajes internos entre comerciales no cuentan como no leídos para el visitante,
      // pero sí para el flujo de notificaciones del comercial receptor.
      const unreadResult = await this.chatRepository.incrementUnreadCount(
        ChatId.create(chatId),
      );

      if (unreadResult.isErr()) {
        // No es crítico — solo logamos el error
        this.logger.warn(
          `No se pudo incrementar unreadMessagesCount para chat ${chatId}: ${unreadResult.error.message}`,
        );
      } else {
        const newCount = unreadResult.value;
        this.logger.log(
          `Chat ${chatId} unreadMessagesCount incrementado a ${newCount}`,
        );
        // Publicar evento de dominio con el nuevo valor confirmado.
        // Esto permite que el handler de notificaciones WS use el valor real
        // sin necesidad de hacer una query adicional (elimina la race condition).
        this.eventBus.publish(
          new UnreadCountUpdatedEvent({
            chatId,
            visitorId: chat.visitorId.getValue(),
            companyId: chat.companyId,
            newCount,
          }),
        );
      }

      this.logger.log(
        `Chat ${chatId} actualizado: totalMessages=${totalMessages}, lastMessageContent: "${contentPreview.substring(0, 50)}..."`,
      );
    } catch (error) {
      const errorObj = error as Error;
      this.logger.error(
        `Error al actualizar chat ${chatId}: ${errorObj.message}`,
        errorObj.stack,
      );
      // No lanzamos el error para no afectar el flujo principal
    }
  }
}
