import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { CreateTrackingEventCommand } from './create-tracking-event.command';
import {
  ITrackingEventRepository,
  TRACKING_EVENT_REPOSITORY,
} from '../../domain/tracking-event.repository';
import { TrackingEvent } from '../../domain/tracking-event.aggregate';
import { TrackingEventId } from '../../domain/value-objects/tracking-event-id';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import { EventType } from '../../domain/value-objects/event-type';
import { TrackingEventMetadata } from '../../domain/value-objects/tracking-event-metadata';
import { TrackingEventOccurredAt } from '../../domain/value-objects/tracking-event-occurred-at';
import { Inject } from '@nestjs/common';

/**
 * Handler para el comando CreateTrackingEventCommand.
 * Se encarga de orquestar la creación de un TrackingEvent y publicar el evento de dominio correspondiente.
 */
@CommandHandler(CreateTrackingEventCommand)
export class CreateTrackingEventCommandHandler
  implements ICommandHandler<CreateTrackingEventCommand>
{
  constructor(
    @Inject(TRACKING_EVENT_REPOSITORY)
    private readonly repository: ITrackingEventRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Ejecuta la lógica de creación del TrackingEvent y publica el evento de dominio.
   * @param command Comando con los datos necesarios para crear el evento.
   */
  async execute(command: CreateTrackingEventCommand): Promise<void> {
    const { id, visitorId, eventType, metadata, occurredAt } = command.params;

    // Instancia la entidad usando value objects
    const trackingEvent = TrackingEvent.create({
      id: TrackingEventId.create(id),
      visitorId: VisitorId.create(visitorId),
      eventType: EventType.create(eventType),
      metadata: TrackingEventMetadata.create(metadata),
      occurredAt: occurredAt
        ? TrackingEventOccurredAt.create(occurredAt)
        : undefined,
    });

    // Publica el evento de dominio usando EventPublisher
    this.eventPublisher.mergeObjectContext(trackingEvent).commit();

    // Persiste la entidad en el repositorio
    await this.repository.save(trackingEvent);
  }
}
