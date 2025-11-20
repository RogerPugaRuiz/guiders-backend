import { EventsHandler, IEventHandler, EventBus } from '@nestjs/cqrs';
import { VisitorConnectionChangedEvent } from '../../domain/events/visitor-connection-changed.event';
import { Inject, Logger } from '@nestjs/common';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import { PresenceChangedEvent } from 'src/context/shared/domain/events/presence-changed.event';

/**
 * Event handler que convierte VisitorConnectionChangedEvent a PresenceChangedEvent
 * para notificación por WebSocket
 *
 * Flujo:
 * 1. Escucha VisitorConnectionChangedEvent (evento específico de visitantes)
 * 2. Obtiene el visitor del repositorio para extraer el tenantId
 * 3. Emite PresenceChangedEvent (evento genérico para notificaciones WebSocket)
 * 4. NotifyPresenceChangedOnPresenceChangedEventHandler recoge el evento y notifica por WS
 */
@EventsHandler(VisitorConnectionChangedEvent)
export class EmitPresenceChangedOnVisitorConnectionChangedEventHandler
  implements IEventHandler<VisitorConnectionChangedEvent>
{
  private readonly logger = new Logger(
    EmitPresenceChangedOnVisitorConnectionChangedEventHandler.name,
  );

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly repository: VisitorV2Repository,
    private readonly eventBus: EventBus,
  ) {}

  async handle(event: VisitorConnectionChangedEvent): Promise<void> {
    try {
      const {
        visitorId: rawId,
        previousConnection,
        newConnection,
      } = event.attributes;

      this.logger.log(
        `🔀 [VisitorConnectionChangedEvent] Visitante ${rawId}: ${previousConnection} → ${newConnection}`,
      );

      // Obtener el visitor para extraer el tenantId
      const visitorIdVO = new VisitorId(rawId);
      const visitorResult = await this.repository.findById(visitorIdVO);

      if (visitorResult.isErr()) {
        this.logger.error(
          `❌ No se pudo encontrar el visitante ${rawId} para emitir PresenceChangedEvent - ERROR: ${visitorResult.error.message}`,
        );
        return;
      }

      const visitor = visitorResult.unwrap();
      const tenantId = visitor.getTenantId().getValue();

      this.logger.log(
        `📋 Visitante encontrado: ${rawId} | TenantId: ${tenantId} | Lifecycle: ${visitor.getLifecycle().getValue()}`,
      );

      // Emitir evento genérico de presencia para notificación WebSocket
      const presenceEvent = new PresenceChangedEvent(
        rawId,
        'visitor',
        previousConnection || 'offline',
        newConnection,
        tenantId,
      );

      this.eventBus.publish(presenceEvent);

      this.logger.log(
        `✅ [PresenceChangedEvent EMITIDO] visitante: ${rawId} | tenant: ${tenantId} | ${previousConnection} → ${newConnection} | userType: visitor`,
      );
    } catch (error) {
      const errorObj = error as Error;
      this.logger.error(
        `Error al emitir PresenceChangedEvent para visitante: ${errorObj.message}`,
        errorObj.stack,
      );
      // No lanzamos el error para no afectar el flujo principal
    }
  }
}
