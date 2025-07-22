import { DomainEvent } from 'src/context/shared/domain/domain-event';

export class VisitorConnectionTimeUpdatedEvent extends DomainEvent<{
  visitorId: string;
  connectionTime: number;
}> {}
