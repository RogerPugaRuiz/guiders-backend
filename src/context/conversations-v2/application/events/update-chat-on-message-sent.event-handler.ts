import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { MessageSentEvent } from '../../domain/events/message-sent.event';
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
 * 4. Guarda el chat actualizado
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

      // Guardar el chat actualizado
      const saveResult = await this.chatRepository.save(updatedChat);

      if (saveResult.isErr()) {
        this.logger.error(
          `Error al guardar chat ${chatId}: ${saveResult.error.message}`,
        );
        return;
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
