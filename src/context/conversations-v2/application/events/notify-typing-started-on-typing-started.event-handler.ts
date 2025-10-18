import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { TypingStartedEvent } from '../../domain/events/typing-started.event';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';

/**
 * Event handler que notifica vía WebSocket cuando un usuario empieza a escribir
 *
 * Flujo:
 * 1. Escucha el evento TypingStartedEvent
 * 2. Obtiene los datos del usuario que está escribiendo
 * 3. Emite notificación a la sala del chat correspondiente
 * 4. Todos los participantes del chat reciben la notificación
 */
@EventsHandler(TypingStartedEvent)
export class NotifyTypingStartedOnTypingStartedEventHandler
  implements IEventHandler<TypingStartedEvent>
{
  private readonly logger = new Logger(
    NotifyTypingStartedOnTypingStartedEventHandler.name,
  );

  constructor(
    @Inject('WEBSOCKET_GATEWAY')
    private readonly websocketGateway: WebSocketGatewayBasic,
  ) {}

  handle(event: TypingStartedEvent): void {
    this.logger.debug(
      `Procesando notificación de typing started: usuario ${event.getUserId()} en chat ${event.getChatId()}`,
    );

    try {
      const chatId = event.getChatId();
      const userId = event.getUserId();
      const userType = event.getUserType();

      // Emitir a la sala del chat
      this.websocketGateway.emitToRoom(`chat:${chatId}`, 'typing:start', {
        chatId,
        userId,
        userType,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `Notificación de typing started enviada a chat: ${chatId}`,
      );
    } catch (error) {
      const errorObj = error as Error;
      this.logger.error(
        `Error al notificar typing started: ${errorObj.message}`,
        errorObj.stack,
      );
      // No lanzamos el error para no afectar el flujo principal
    }
  }
}
