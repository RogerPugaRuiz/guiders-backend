import { IEvent } from '@nestjs/cqrs';
import { TrackingVisitorPrimitives } from '../tracking-visitor-primitives';

export class TrackingVisitorCreatedEvent implements IEvent {
  constructor(
    public readonly trackingVisitorPrimitives: TrackingVisitorPrimitives,
  ) {}
}
