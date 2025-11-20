import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CommercialConnectionStatusChangedEvent } from '../../domain/events/commercial-connection-status-changed.event';

/**
 * Event Handler para actualizar métricas cuando un comercial se desconecta
 * Side effect que se ejecuta cuando se emite CommercialConnectionStatusChangedEvent
 * y el nuevo estado es 'offline'
 */
@EventsHandler(CommercialConnectionStatusChangedEvent)
export class UpdateMetricsOnCommercialDisconnectedEventHandler
  implements IEventHandler<CommercialConnectionStatusChangedEvent>
{
  private readonly logger = new Logger(
    UpdateMetricsOnCommercialDisconnectedEventHandler.name,
  );

  handle(event: CommercialConnectionStatusChangedEvent): void {
    // Solo procesar cuando el estado cambia a offline
    if (event.attributes.newStatus !== 'offline') {
      return;
    }

    this.logger.log(
      `Actualizando métricas por desconexión de comercial: ${event.attributes.commercialId}`,
    );

    try {
      // TODO: Implementar lógica para actualizar métricas
      // Esto podría involucrar:
      // 1. Calcular tiempo de conexión total
      // 2. Actualizar estadísticas de disponibilidad
      // 3. Registrar tiempo de sesión
      // 4. Actualizar métricas de performance
      // 5. Notificar dashboards/reporting

      const { commercialId, previousStatus, newStatus, changedAt } =
        event.attributes;

      this.logger.debug(
        `Métricas actualizadas - Comercial: ${commercialId}, ` +
          `Estado anterior: ${previousStatus}, Nuevo estado: ${newStatus}, ` +
          `Tiempo de cambio: ${changedAt.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al actualizar métricas para comercial ${event.attributes.commercialId}:`,
        error,
      );
      // Note: No relanzamos el error para no afectar el flujo principal
    }
  }
}
