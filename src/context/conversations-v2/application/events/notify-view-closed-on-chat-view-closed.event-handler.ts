import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ChatViewClosedEvent } from '../../domain/events/chat-view-closed.event';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';

/**
 * Event handler que notifica vía WebSocket cuando un usuario cierra la vista del chat
 *
 * Flujo:
 * 1. Escucha el evento ChatViewClosedEvent
 * 2. Obtiene los datos del cierre de vista
 * 3. Emite notificación a la sala del chat correspondiente
 * 4. Permite a otros participantes saber que alguien dejó de ver el chat
 *
 * Patrón: NotifyViewClosedOnChatViewClosedEventHandler
 */
@EventsHandler(ChatViewClosedEvent)
export class NotifyViewClosedOnChatViewClosedEventHandler
  implements IEventHandler<ChatViewClosedEvent>
{
  private readonly logger = new Logger(
    NotifyViewClosedOnChatViewClosedEventHandler.name,
  );

  constructor(
    @Inject('WEBSOCKET_GATEWAY')
    private readonly websocketGateway: WebSocketGatewayBasic,
  ) {}

  handle(event: ChatViewClosedEvent): void {
    this.logger.log(
      `Procesando notificación de vista cerrada: chat ${event.getChatId()} por ${event.getUserRole()} ${event.getUserId()}`,
    );

    try {
      const viewData = event.getViewData();
      const chatId = event.getChatId();

      // Emitir a la sala general del chat
      this.websocketGateway.emitToRoom(`chat:${chatId}`, 'chat:view-closed', {
        chatId: viewData.chatId,
        userId: viewData.userId,
        userRole: viewData.userRole,
        closedAt: viewData.closedAt.toISOString(),
      });

      // Si es un comercial, también notificar a la sala de comerciales
      if (event.isCommercial()) {
        this.websocketGateway.emitToRoom(
          `chat:${chatId}:commercial`,
          'chat:view-closed',
          {
            chatId: viewData.chatId,
            userId: viewData.userId,
            userRole: viewData.userRole,
            closedAt: viewData.closedAt.toISOString(),
          },
        );
      }

      this.logger.log(
        `Notificación de vista cerrada enviada exitosamente para chat: ${chatId}`,
      );
    } catch (error) {
      const errorObj = error as Error;
      this.logger.error(
        `Error al notificar vista cerrada: ${errorObj.message}`,
        errorObj.stack,
      );
      // No lanzamos el error para no afectar el flujo principal
    }
  }
}
