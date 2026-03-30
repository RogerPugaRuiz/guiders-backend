import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { AgentRequestedEvent } from '../../domain/events/agent-requested.event';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';

/**
 * Event handler que notifica vía WebSocket cuando un visitante solicita un agente
 *
 * Flujo:
 * 1. Escucha el evento AgentRequestedEvent
 * 2. Obtiene los datos de la solicitud
 * 3. Emite notificación a la sala de comerciales del chat
 * 4. Los comerciales reciben alerta de que el visitante necesita atención urgente
 *
 * Patrón: NotifyAgentRequestedOnAgentRequestedEventHandler
 */
@EventsHandler(AgentRequestedEvent)
export class NotifyAgentRequestedOnAgentRequestedEventHandler
  implements IEventHandler<AgentRequestedEvent>
{
  private readonly logger = new Logger(
    NotifyAgentRequestedOnAgentRequestedEventHandler.name,
  );

  constructor(
    @Inject('WEBSOCKET_GATEWAY')
    private readonly websocketGateway: WebSocketGatewayBasic,
  ) {}

  handle(event: AgentRequestedEvent): void {
    this.logger.log(
      `Procesando notificación de solicitud de agente para chat: ${event.getChatId()}`,
    );

    try {
      const requestData = event.getRequestData();
      const chatId = event.getChatId();

      // Emitir a sala de comerciales del chat
      this.websocketGateway.emitToRoom(
        `chat:${chatId}:commercial`,
        'chat:agent-requested',
        {
          chatId: requestData.chatId,
          visitorId: requestData.visitorId,
          previousPriority: requestData.previousPriority,
          priority: requestData.newPriority,
          source: requestData.source,
          timestamp: requestData.requestedAt.toISOString(),
        },
      );

      // También emitir cambio de prioridad si hubo cambio
      if (event.hadPriorityChange()) {
        this.websocketGateway.emitToRoom(
          `chat:${chatId}:commercial`,
          'chat:priority-changed',
          {
            chatId: requestData.chatId,
            previousPriority: requestData.previousPriority,
            newPriority: requestData.newPriority,
            reason: 'agent_requested',
            timestamp: requestData.requestedAt.toISOString(),
          },
        );
      }

      this.logger.log(
        `Notificación de solicitud de agente enviada a comerciales del chat: ${chatId}`,
      );
    } catch (error) {
      const errorObj = error as Error;
      this.logger.error(
        `Error al notificar solicitud de agente: ${errorObj.message}`,
        errorObj.stack,
      );
      // No lanzamos el error para no afectar el flujo principal
      // La notificación es un side-effect, no debe fallar la operación principal
    }
  }
}
