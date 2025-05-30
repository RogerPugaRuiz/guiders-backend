import { ICommand } from '@nestjs/cqrs';

// Comando para procesar eventos de tracking y detectar intención
export class ProcessTrackingEventCommand implements ICommand {
  constructor(
    public readonly visitorId: string,
    public readonly trackingEvents: any[], // Se recomienda tipar con TrackingEvent si está disponible
  ) {}
}
