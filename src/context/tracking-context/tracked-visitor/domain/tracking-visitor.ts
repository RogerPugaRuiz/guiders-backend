import { AggregateRoot } from '@nestjs/cqrs';
import { UUID } from 'src/context/shared/domain/uuid';

export class TrackingVisitor extends AggregateRoot {
  constructor(
    public readonly id: UUID,
    public readonly name: TrackingVisitorName | null,
    public readonly connectionDuration: TrackingVisitorConnectionDuration,
    public readonly createdAt: TrackingVisitorCreatedAt,
    public readonly updatedAt: TrackingVisitorUpdatedAt,
  ) {
    super();
  }
}
