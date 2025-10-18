import { ICommand } from '@nestjs/cqrs';
import { IngestTrackingEventDto } from '../dtos';

/**
 * Command para ingestar eventos de tracking en batch
 */
export class IngestTrackingEventsCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly siteId: string,
    public readonly events: IngestTrackingEventDto[],
  ) {}
}
