import { EventsHandler, IEventHandler, EventBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CommercialConnectionStatusChangedEvent } from '../../domain/events/commercial-connection-status-changed.event';
import { PresenceChangedEvent } from 'src/context/shared/domain/events/presence-changed.event';

/**
 * Event handler que convierte CommercialConnectionStatusChangedEvent a PresenceChangedEvent
 * para notificación por WebSocket
 *
 * Flujo:
 * 1. Escucha CommercialConnectionStatusChangedEvent (evento específico de comerciales)
 * 2. Emite PresenceChangedEvent (evento genérico para notificaciones WebSocket)
 * 3. NotifyPresenceChangedOnPresenceChangedEventHandler recoge el evento y notifica por WS
 */
@EventsHandler(CommercialConnectionStatusChangedEvent)
export class EmitPresenceChangedOnCommercialConnectionStatusChangedEventHandler
  implements IEventHandler<CommercialConnectionStatusChangedEvent>
{
  private readonly logger = new Logger(
    EmitPresenceChangedOnCommercialConnectionStatusChangedEventHandler.name,
  );

  constructor(private readonly eventBus: EventBus) {}

  handle(event: CommercialConnectionStatusChangedEvent): void {
    try {
      const { commercialId, previousStatus, newStatus } = event.attributes;

      this.logger.debug(
        `Procesando cambio de conexión de comercial: ${commercialId} de ${previousStatus} a ${newStatus}`,
      );

      // Emitir evento genérico de presencia para notificación WebSocket
      // Nota: tenantId es opcional y por ahora lo omitimos para comerciales
      // ya que el agregado Commercial no tiene tenantId directamente
      const presenceEvent = new PresenceChangedEvent(
        commercialId,
        'commercial',
        previousStatus,
        newStatus,
        undefined, // tenantId opcional
      );

      this.eventBus.publish(presenceEvent);

      this.logger.debug(
        `PresenceChangedEvent emitido para comercial: ${commercialId}`,
      );
    } catch (error) {
      const errorObj = error as Error;
      this.logger.error(
        `Error al emitir PresenceChangedEvent para comercial: ${errorObj.message}`,
        errorObj.stack,
      );
      // No lanzamos el error para no afectar el flujo principal
    }
  }
}
