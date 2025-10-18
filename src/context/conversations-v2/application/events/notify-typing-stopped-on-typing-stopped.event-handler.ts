import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { TypingStoppedEvent } from '../../domain/events/typing-stopped.event';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';

/**
 * Event handler que notifica vía WebSocket cuando un usuario deja de escribir
 *
 * Flujo:
 * 1. Escucha el evento TypingStoppedEvent
 * 2. Obtiene los datos del usuario que dejó de escribir
 * 3. Emite notificación a la sala del chat correspondiente
 * 4. Todos los participantes del chat reciben la notificación
 */
@EventsHandler(TypingStoppedEvent)
export class NotifyTypingStoppedOnTypingStoppedEventHandler
  implements IEventHandler<TypingStoppedEvent>
{
  private readonly logger = new Logger(
    NotifyTypingStoppedOnTypingStoppedEventHandler.name,
  );

  constructor(
    @Inject('WEBSOCKET_GATEWAY')
    private readonly websocketGateway: WebSocketGatewayBasic,
  ) {}

  handle(event: TypingStoppedEvent): void {
    this.logger.debug(
      `Procesando notificación de typing stopped: usuario ${event.getUserId()} en chat ${event.getChatId()}`,
    );

    try {
      const chatId = event.getChatId();
      const userId = event.getUserId();
      const userType = event.getUserType();

      // Emitir a la sala del chat
      this.websocketGateway.emitToRoom(`chat:${chatId}`, 'typing:stop', {
        chatId,
        userId,
        userType,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `Notificación de typing stopped enviada a chat: ${chatId}`,
      );
    } catch (error) {
      const errorObj = error as Error;
      this.logger.error(
        `Error al notificar typing stopped: ${errorObj.message}`,
        errorObj.stack,
      );
      // No lanzamos el error para no afectar el flujo principal
    }
  }
}
