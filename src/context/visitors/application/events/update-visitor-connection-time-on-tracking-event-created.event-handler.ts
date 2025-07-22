import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { TrackingEventCreatedEvent } from 'src/context/tracking/domain/events/tracking-event-created-event';
import { UpdateVisitorConnectionTimeCommand } from '../commands/update-visitor-connection-time.command';

/**
 * Event handler que escucha eventos TrackingEventCreatedEvent del contexto tracking
 * y actualiza el tiempo de conexión del visitante basado en la información de sesión en la metadata
 */
@EventsHandler(TrackingEventCreatedEvent)
export class UpdateVisitorConnectionTimeOnTrackingEventCreatedEventHandler
  implements IEventHandler<TrackingEventCreatedEvent>
{
  private readonly logger = new Logger(
    UpdateVisitorConnectionTimeOnTrackingEventCreatedEventHandler.name,
  );

  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Maneja el evento de creación de tracking event
   * Extrae el tiempo de conexión de la metadata.session.totalActiveTime y actualiza el visitante
   * @param event Evento con los datos del tracking event creado
   */
  async handle(event: TrackingEventCreatedEvent): Promise<void> {
    this.logger.log(
      `Evento TrackingEventCreated recibido para visitante: ${event.attributes.visitorId} con tipo: ${event.attributes.eventType}`,
    );

    this.logger.log(`Event attributes: ${JSON.stringify(event.attributes)}`);

    try {
      // Extraemos el tiempo de conexión de la metadata de forma type-safe
      const metadata = event.attributes.metadata;
      const connectionTime = this.extractConnectionTimeFromMetadata(metadata);

      if (connectionTime !== null && connectionTime > 0) {
        this.logger.log(
          `Actualizando tiempo de conexión del visitante ${event.attributes.visitorId} a: ${connectionTime}ms`,
        );

        // Enviamos el comando para actualizar el tiempo de conexión del visitante
        await this.commandBus.execute(
          new UpdateVisitorConnectionTimeCommand(
            event.attributes.visitorId,
            connectionTime,
          ),
        );

        this.logger.log(
          `Tiempo de conexión del visitante ${event.attributes.visitorId} actualizado correctamente a: ${connectionTime}ms`,
        );
      } else {
        this.logger.log(
          `Evento recibido para visitante ${event.attributes.visitorId} pero no se encontró información válida de tiempo de conexión en la metadata`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al manejar evento TrackingEventCreated para actualizar tiempo de conexión del visitante: ${errorMessage}`,
      );
    }
  }

  /**
   * Extrae información del tiempo de conexión de la metadata de forma type-safe
   * La metadata tiene una estructura anidada donde la información de sesión está en metadata.session
   * Busca el campo totalActiveTime que representa el tiempo total activo de la sesión
   * @param metadata Metadata del tracking event con estructura anidada
   * @returns El tiempo de conexión extraído en milisegundos o null si no se encuentra
   */
  private extractConnectionTimeFromMetadata(
    metadata: Record<string, any>,
  ): number | null {
    // Verificar que existe el objeto session en metadata
    if (!metadata.session || typeof metadata.session !== 'object') {
      return null;
    }

    const sessionData = metadata.session as Record<string, unknown>;

    // Type guard para verificar que totalActiveTime sea un número válido
    if (
      typeof sessionData.totalActiveTime === 'number' &&
      sessionData.totalActiveTime >= 0
    ) {
      return sessionData.totalActiveTime;
    }

    // Intentar parsear como string si viene como tal
    if (typeof sessionData.totalActiveTime === 'string') {
      const parsedTime = parseInt(sessionData.totalActiveTime, 10);
      if (!isNaN(parsedTime) && parsedTime >= 0) {
        return parsedTime;
      }
    }

    return null;
  }
}
