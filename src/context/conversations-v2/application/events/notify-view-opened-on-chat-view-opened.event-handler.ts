import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ChatViewOpenedEvent } from '../../domain/events/chat-view-opened.event';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';

/**
 * Event handler que notifica vía WebSocket cuando un usuario abre la vista del chat
 *
 * Flujo:
 * 1. Escucha el evento ChatViewOpenedEvent
 * 2. Obtiene los datos de la apertura de vista
 * 3. Emite notificación a la sala del chat correspondiente
 * 4. Permite a otros participantes saber que alguien está viendo el chat
 *
 * Patrón: NotifyViewOpenedOnChatViewOpenedEventHandler
 */
@EventsHandler(ChatViewOpenedEvent)
export class NotifyViewOpenedOnChatViewOpenedEventHandler
  implements IEventHandler<ChatViewOpenedEvent>
{
  private readonly logger = new Logger(
    NotifyViewOpenedOnChatViewOpenedEventHandler.name,
  );

  constructor(
    @Inject('WEBSOCKET_GATEWAY')
    private readonly websocketGateway: WebSocketGatewayBasic,
  ) {}

  handle(event: ChatViewOpenedEvent): void {
    this.logger.log(
      `Procesando notificación de vista abierta: chat ${event.getChatId()} por ${event.getUserRole()} ${event.getUserId()}`,
    );

    try {
      const viewData = event.getViewData();
      const chatId = event.getChatId();

      // Emitir a la sala general del chat
      this.websocketGateway.emitToRoom(`chat:${chatId}`, 'chat:view-opened', {
        chatId: viewData.chatId,
        userId: viewData.userId,
        userRole: viewData.userRole,
        openedAt: viewData.openedAt.toISOString(),
      });

      // Si es un comercial, también notificar a la sala de comerciales
      if (event.isCommercial()) {
        this.websocketGateway.emitToRoom(
          `chat:${chatId}:commercial`,
          'chat:view-opened',
          {
            chatId: viewData.chatId,
            userId: viewData.userId,
            userRole: viewData.userRole,
            openedAt: viewData.openedAt.toISOString(),
          },
        );
      }

      this.logger.log(
        `Notificación de vista abierta enviada exitosamente para chat: ${chatId}`,
      );
    } catch (error) {
      const errorObj = error as Error;
      this.logger.error(
        `Error al notificar vista abierta: ${errorObj.message}`,
        errorObj.stack,
      );
      // No lanzamos el error para no afectar el flujo principal
    }
  }
}
