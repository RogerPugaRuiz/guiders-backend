import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { VisitorBecameHighIntentEvent } from '../../domain/events/visitor-became-high-intent.event';
import { WebSocketGatewayBasic } from '../../../../websocket/websocket.gateway';

/**
 * Event handler que notifica a los comerciales vía WebSocket
 * cuando un visitante alcanza el tier "hot" (alta intención)
 */
@EventsHandler(VisitorBecameHighIntentEvent)
export class NotifyHighIntentOnVisitorBecameHighIntentEventHandler
  implements IEventHandler<VisitorBecameHighIntentEvent>
{
  private readonly logger = new Logger(
    NotifyHighIntentOnVisitorBecameHighIntentEventHandler.name,
  );

  constructor(
    @Inject('WEBSOCKET_GATEWAY')
    private readonly websocketGateway: WebSocketGatewayBasic,
  ) {}

  async handle(event: VisitorBecameHighIntentEvent): Promise<void> {
    const { visitorId, tenantId, siteId, fingerprint, leadScore, timestamp } =
      event.attributes;

    this.logger.log(
      `🔥 Visitante ${visitorId} alcanzó tier HOT (score: ${leadScore.score})`,
    );

    try {
      // Emitir evento WebSocket a todos los comerciales del tenant
      const payload = {
        visitorId,
        fingerprint,
        siteId,
        leadScore,
        timestamp,
      };

      // Notificar a la room del tenant
      this.websocketGateway.emitToRoom(
        `tenant:${tenantId}`,
        'visitor:high-intent',
        payload,
      );

      this.logger.log(
        `📢 Notificado tenant ${tenantId} sobre visitante high-intent ${visitorId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al notificar high-intent del visitante ${visitorId}:`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
