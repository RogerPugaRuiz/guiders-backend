import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { TrackingEventCreatedEvent } from 'src/context/tracking/domain/events/tracking-event-created-event';
import { UpdateVisitorCurrentPageCommand } from '../commands/update-visitor-current-page.command';

/**
 * Event handler que escucha eventos TrackingEventCreatedEvent del contexto tracking
 * y actualiza la página actual del visitante cuando el tipo de evento es 'page_view'
 */
@EventsHandler(TrackingEventCreatedEvent)
export class UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler
  implements IEventHandler<TrackingEventCreatedEvent>
{
  private readonly logger = new Logger(
    UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler.name,
  );

  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Maneja el evento de creación de tracking event
   * Solo procesa eventos de tipo 'page_view' para actualizar la página actual del visitante
   * @param event Evento con los datos del tracking event creado
   */
  async handle(event: TrackingEventCreatedEvent): Promise<void> {
    this.logger.log(
      `Evento TrackingEventCreated recibido para visitante: ${event.attributes.visitorId} con tipo: ${event.attributes.eventType}`,
    );

    this.logger.log(`Event attributes: ${JSON.stringify(event.attributes)}`);

    try {
      // Solo procesamos eventos de tipo 'page_view'
      if (event.attributes.eventType === 'page_view') {
        // Extraemos la página de la metadata de forma type-safe
        const metadata = event.attributes.metadata;
        const currentPage = this.extractPageFromMetadata(metadata);

        if (currentPage) {
          this.logger.log(
            `Actualizando página actual del visitante ${event.attributes.visitorId} a: ${currentPage}`,
          );

          // Enviamos el comando para actualizar la página actual del visitante
          await this.commandBus.execute(
            new UpdateVisitorCurrentPageCommand(
              event.attributes.visitorId,
              currentPage,
            ),
          );

          this.logger.log(
            `Página actual del visitante ${event.attributes.visitorId} actualizada correctamente a: ${currentPage}`,
          );
        } else {
          this.logger.warn(
            `Evento page_view recibido para visitante ${event.attributes.visitorId} pero no se encontró información de página en la metadata`,
          );
        }
      } else {
        this.logger.log(
          `Evento de tipo ${event.attributes.eventType} ignorado (solo se procesan eventos page_view)`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al manejar evento TrackingEventCreated para actualizar página actual del visitante: ${errorMessage}`,
      );
    }
  }

  /**
   * Extrae información de página de la metadata de forma type-safe
   * La metadata tiene una estructura anidada donde la página está en metadata.page
   * Prioriza: url > path para obtener la URL completa o el path
   * @param metadata Metadata del tracking event con estructura anidada
   * @returns La página extraída como string o null si no se encuentra
   */
  private extractPageFromMetadata(
    metadata: Record<string, any>,
  ): string | null {
    // Verificar que existe el objeto page en metadata
    if (!metadata.page || typeof metadata.page !== 'object') {
      return null;
    }

    const pageData = metadata.page as Record<string, unknown>;

    // Type guards para verificar que los valores sean strings
    // Prioriza url para obtener la URL completa
    if (typeof pageData.url === 'string' && pageData.url.trim().length > 0) {
      return pageData.url;
    }

    // Si no hay URL, intentamos con el path
    if (typeof pageData.path === 'string' && pageData.path.trim().length > 0) {
      return pageData.path;
    }

    return null;
  }
}
