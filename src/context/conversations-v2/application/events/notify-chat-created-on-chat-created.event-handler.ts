import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ChatCreatedEvent } from '../../domain/events/chat-created.event';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';

/**
 * Event handler que notifica vía WebSocket cuando se crea un chat
 *
 * Casos de uso:
 * 1. Un comercial crea un chat proactivamente para un visitante
 * 2. Un visitante crea un chat para sí mismo (también se notifica)
 *
 * Flujo:
 * 1. Escucha el evento ChatCreatedEvent
 * 2. Obtiene los datos del chat creado
 * 3. Emite notificación a la sala del visitante (visitor:{visitorId})
 * 4. El visitante recibe la notificación con información del nuevo chat
 *
 * Patrón: NotifyChatCreatedOnChatCreatedEventHandler
 */
@EventsHandler(ChatCreatedEvent)
export class NotifyChatCreatedOnChatCreatedEventHandler
  implements IEventHandler<ChatCreatedEvent>
{
  private readonly logger = new Logger(
    NotifyChatCreatedOnChatCreatedEventHandler.name,
  );

  constructor(
    @Inject('WEBSOCKET_GATEWAY')
    private readonly websocketGateway: WebSocketGatewayBasic,
  ) {}

  handle(event: ChatCreatedEvent): void {
    this.logger.debug(
      '=== INICIO NotifyChatCreatedOnChatCreatedEventHandler ===',
    );
    this.logger.log(
      `Procesando notificación de chat creado: ${event.getChatId()}`,
    );

    try {
      const chatData = event.getChatData();
      const visitorId = event.getVisitorId();
      const companyId = event.getCompanyId();

      this.logger.log(
        `📍 Datos del evento: chatId=${chatData.chatId}, visitorId=${visitorId}, status=${chatData.status}`,
      );

      this.logger.log(
        `🔔 Notificando al visitante ${visitorId} de nuevo chat: ${chatData.chatId}`,
      );

      const roomName = `visitor:${visitorId}`;
      this.logger.debug(`📡 Emitiendo a la sala: ${roomName}`);

      const payload = {
        chatId: chatData.chatId,
        visitorId: chatData.visitorId,
        status: chatData.status,
        priority: chatData.priority,
        visitorInfo: chatData.visitorInfo,
        metadata: chatData.metadata,
        createdAt: chatData.createdAt.toISOString(),
        message: 'Un comercial ha iniciado una conversación contigo',
      };

      this.logger.debug(`📦 Payload: ${JSON.stringify(payload)}`);

      // Emitir a la sala del visitante
      this.websocketGateway.emitToRoom(roomName, 'chat:created', payload);

      // Emitir también al room del tenant para que la lista de visitantes
      // se actualice en tiempo real cuando se crea un nuevo chat
      if (companyId) {
        this.websocketGateway.emitToRoom(
          `tenant:${companyId}`,
          'chat:created',
          payload,
        );
        this.logger.log(
          `📢 Notificado tenant ${companyId} de nuevo chat ${chatData.chatId} para visitante ${visitorId}`,
        );
      }

      this.logger.log(
        `✅ Notificación de chat creado enviada exitosamente al visitante ${visitorId}`,
      );
      this.logger.debug(
        '=== FIN NotifyChatCreatedOnChatCreatedEventHandler ===',
      );
    } catch (error) {
      const errorObj = error as Error;
      this.logger.error(
        `❌ Error al notificar chat creado: ${errorObj.message}`,
        errorObj.stack,
      );
      // No lanzamos el error para no afectar el flujo principal
      // La notificación es un side-effect, no debe fallar la operación principal
    }
  }
}
