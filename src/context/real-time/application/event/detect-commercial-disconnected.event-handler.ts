import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { DisconnectedEvent } from '../../domain/events/disconnected.event';
import { CommercialDisconnectedEvent } from '../../domain/events/commercial-disconnected.event';
import { ConnectionRole } from '../../domain/value-objects/connection-role';
import { Logger } from '@nestjs/common';

/**
 * Event handler que detecta cuando un comercial se desconecta
 * Escucha el evento DisconnectedEvent general y si es un comercial,
 * publica un evento específico CommercialDisconnectedEvent
 */
@EventsHandler(DisconnectedEvent)
export class DetectCommercialDisconnectedEventHandler
  implements IEventHandler<DisconnectedEvent>
{
  private readonly logger = new Logger(
    DetectCommercialDisconnectedEventHandler.name,
  );

  constructor(private readonly eventBus: EventBus) {}

  /**
   * Maneja el evento de desconexión general y detecta si es un comercial
   * @param event Evento de desconexión general
   */
  handle(event: DisconnectedEvent): void {
    const { connection } = event;

    // Verificamos si el usuario desconectado es un comercial
    const isCommercial = connection.roles.includes(ConnectionRole.COMMERCIAL);

    if (isCommercial) {
      this.logger.log(
        `Detectada desconexión de comercial: ${connection.userId}`,
      );

      // Publicamos el evento específico de desconexión de comercial
      this.eventBus.publish(
        new CommercialDisconnectedEvent(connection, event.timestamp),
      );
    }
  }
}
