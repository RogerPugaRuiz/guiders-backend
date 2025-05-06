import { Inject } from '@nestjs/common';
import { EventPublisher, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { VisitorAccountCreatedEvent } from 'src/context/auth/auth-visitor/domain/events/visitor-account-created.event';
import {
  ITrackingVisitorRepository,
  TRACKING_VISITOR_REPOSITORY,
} from '../../domain/tracking-visitor.repository';
import { TrackingVisitor } from '../../domain/tracking-visitor';
import { TrackingVisitorId } from '../../domain/value-objects/tracking-visitor-id';

@EventsHandler(VisitorAccountCreatedEvent)
export class NewTrackingVisitorOnVisitorAccountCreate
  implements IEventHandler<VisitorAccountCreatedEvent>
{
  constructor(
    @Inject(TRACKING_VISITOR_REPOSITORY)
    private readonly trackingVisitorRepository: ITrackingVisitorRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async handle(event: VisitorAccountCreatedEvent) {
    const { visitorAccountPrimitive } = event;
    const newTrackingVisitor = TrackingVisitor.create(
      new TrackingVisitorId(visitorAccountPrimitive.id),
    );

    const newTrackingVisitorWithPublisher =
      this.publisher.mergeObjectContext(newTrackingVisitor);

    await this.trackingVisitorRepository.save(newTrackingVisitorWithPublisher);
    newTrackingVisitorWithPublisher.commit();
  }
}
