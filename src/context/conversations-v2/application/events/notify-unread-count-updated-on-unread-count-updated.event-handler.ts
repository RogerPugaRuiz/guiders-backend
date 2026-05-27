import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { UnreadCountUpdatedEvent } from '../../domain/events/unread-count-updated.event';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';

/**
 * Event handler que notifica vía WebSocket cuando el contador de mensajes no leídos
 * de un chat ha sido actualizado.
 *
 * Flujo:
 * 1. Escucha UnreadCountUpdatedEvent publicado por UpdateChatOnMessageSentEventHandler
 * 2. Emite el evento WS 'chat:unread_count' con el nuevo valor confirmado de MongoDB
 *
 * Al usar el valor del evento de dominio (escrito por $inc atómico) en lugar de
 * consultar el repositorio de forma independiente, se elimina la race condition
 * que existía entre los dos handlers que escuchaban MessageSentEvent.
 *
 * El frontend debe escuchar 'chat:unread_count' para actualizar el badge del sidebar
 * y el icono de la columna de actividad.
 *
 * Patrón: NotifyUnreadCountUpdatedOnUnreadCountUpdatedEventHandler
 */
@EventsHandler(UnreadCountUpdatedEvent)
export class NotifyUnreadCountUpdatedOnUnreadCountUpdatedEventHandler
  implements IEventHandler<UnreadCountUpdatedEvent>
{
  private readonly logger = new Logger(
    NotifyUnreadCountUpdatedOnUnreadCountUpdatedEventHandler.name,
  );

  constructor(
    @Inject('WEBSOCKET_GATEWAY')
    private readonly websocketGateway: WebSocketGatewayBasic,
  ) {}

  handle(event: UnreadCountUpdatedEvent): void {
    const chatId = event.getChatId();
    const newCount = event.getNewCount();

    this.logger.log(
      `Notificando unreadMessagesCount actualizado para chat ${chatId}: ${newCount}`,
    );

    try {
      // Notificar solo a la sala de comerciales — los visitantes no necesitan el badge
      this.websocketGateway.emitToRoom(
        `chat:${chatId}:commercial`,
        'chat:unread_count',
        {
          chatId,
          unreadMessagesCount: newCount,
        },
      );
    } catch (error) {
      const errorObj = error as Error;
      this.logger.error(
        `Error al notificar unread count para chat ${chatId}: ${errorObj.message}`,
        errorObj.stack,
      );
    }
  }
}
