import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CommercialHeartbeatReceivedEvent } from '../../domain/events/commercial-heartbeat-received.event';

/**
 * Event Handler para registrar actividad cuando se recibe heartbeat de comercial
 * Side effect que se ejecuta cuando se emite CommercialHeartbeatReceivedEvent
 */
@EventsHandler(CommercialHeartbeatReceivedEvent)
export class LogActivityOnCommercialHeartbeatReceivedEventHandler
  implements IEventHandler<CommercialHeartbeatReceivedEvent>
{
  private readonly logger = new Logger(
    LogActivityOnCommercialHeartbeatReceivedEventHandler.name,
  );

  handle(event: CommercialHeartbeatReceivedEvent): void {
    this.logger.debug(
      `Registrando actividad de heartbeat para comercial: ${event.attributes.commercialId}`,
    );

    try {
      // TODO: Implementar lógica para registrar actividad
      // Esto podría involucrar:
      // 1. Guardar log de actividad en base de datos
      // 2. Actualizar métricas de actividad
      // 3. Registrar timestamp de última actividad
      // 4. Actualizar estadísticas de disponibilidad
      // 5. Notificar sistemas de monitoreo

      const { commercialId, lastActivity, connectionStatus } = event.attributes;

      this.logger.debug(
        `Actividad registrada - Comercial: ${commercialId}, ` +
          `Última actividad: ${lastActivity.toISOString()}, Estado: ${connectionStatus}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al registrar actividad para comercial ${event.attributes.commercialId}:`,
        error,
      );
      // Note: No relanzamos el error para no afectar el flujo principal
    }
  }
}
