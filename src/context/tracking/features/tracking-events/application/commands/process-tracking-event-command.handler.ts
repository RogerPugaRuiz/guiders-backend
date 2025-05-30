import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ProcessTrackingEventCommand } from './process-tracking-event.command';
import { BasicIntentDetector } from 'src/context/tracking/features/tracking-events/domain/basic-intent-detector';
import { VisitorId } from 'src/context/tracking/features/tracking-events/domain/value-objects/visitor-id';
import { TrackingEvent } from 'src/context/tracking/features/tracking-events/domain/tracking-event';
import {
  IIntentDetectorRepository,
  INTENT_DETECTOR_REPOSITORY,
} from 'src/context/tracking/features/tracking-events/domain/intent-detector.repository';
import { Injectable, Inject } from '@nestjs/common';

// Handler para procesar eventos de tracking y detectar intención
@CommandHandler(ProcessTrackingEventCommand)
@Injectable()
export class ProcessTrackingEventCommandHandler
  implements ICommandHandler<ProcessTrackingEventCommand>
{
  constructor(
    private readonly intentDetector: BasicIntentDetector,
    @Inject(INTENT_DETECTOR_REPOSITORY)
    private readonly intentRepository: IIntentDetectorRepository,
  ) {}

  // Ejecuta el comando: procesa los eventos y almacena la intención detectada
  async execute(command: ProcessTrackingEventCommand): Promise<void> {
    // Convierte los eventos a entidades de dominio
    const visitorId = VisitorId.create(command.visitorId);
    const events = command.trackingEvents.map(
      (e: {
        id: string;
        visitorId: string;
        eventType: string;
        metadata: Record<string, any>;
        occurredAt: string | number | Date;
      }) => TrackingEvent.fromPrimitives(e),
    );
    // Detecta la intención
    const intent = this.intentDetector.detect(visitorId, events);
    if (intent) {
      await this.intentRepository.save(intent);
    }
  }
}
