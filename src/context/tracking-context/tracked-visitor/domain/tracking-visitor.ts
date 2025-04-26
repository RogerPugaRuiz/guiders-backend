import { AggregateRoot } from '@nestjs/cqrs';
import { TrackingVisitorName } from './value-objects/tracking-visitor-name';
import { TrackingVisitorConnectionDuration } from './value-objects/tracking-visitor-connection-duration';
import { TrackingVisitorCreatedAt } from './value-objects/tracking-visitor-created-at';
import { TrackingVisitorUpdatedAt } from './value-objects/tracking-visitor-updated-at';
import { TrackingVisitorIsConnected } from './value-objects/tracking-visitor-is-connected';
import { TrackingVisitorPrimitives } from './tracking-visitor-primitives';
import { TrackingVisitorCurrentURL } from './value-objects/tracking-visitor-current-url';
import { TrackingVisitorId } from './value-objects/tracking-visitor-id';
import { TrackingVisitorCreatedEvent } from './events/tracking-visitor-created.event';
import { TrackingUltimateConnectionDate } from './value-objects/tracking-ultimate-connection-date';

export class TrackingVisitor extends AggregateRoot {
  constructor(
    public readonly id: TrackingVisitorId,
    public readonly name: TrackingVisitorName | null,
    public readonly currentUrl: TrackingVisitorCurrentURL | null,
    public readonly connectionDuration: TrackingVisitorConnectionDuration,
    public readonly ultimateConnectionDate: TrackingUltimateConnectionDate | null,
    public readonly isConnected: TrackingVisitorIsConnected,
    public readonly createdAt: TrackingVisitorCreatedAt,
    public readonly updatedAt: TrackingVisitorUpdatedAt,
  ) {
    super();
  }

  static fromPrimitives(params: TrackingVisitorPrimitives): TrackingVisitor {
    return new TrackingVisitor(
      new TrackingVisitorId(params.id),
      params.name ? new TrackingVisitorName(params.name) : null,
      params.currentUrl
        ? new TrackingVisitorCurrentURL(params.currentUrl)
        : null,
      new TrackingVisitorConnectionDuration(params.connectionDuration),
      params.ultimateConnectionDate
        ? new TrackingUltimateConnectionDate(params.ultimateConnectionDate)
        : null,
      new TrackingVisitorIsConnected(params.isConnected),
      new TrackingVisitorCreatedAt(params.createdAt),
      new TrackingVisitorUpdatedAt(params.updatedAt),
    );
  }

  static create(id: TrackingVisitorId): TrackingVisitor {
    const newTrackingVisitor = new TrackingVisitor(
      id,
      null, // Default name
      null, // Default currentUrl
      new TrackingVisitorConnectionDuration(0), // Default connectionDuration
      null, // Default ultimateConnectionDate
      new TrackingVisitorIsConnected(false), // Default isConnected
      new TrackingVisitorCreatedAt(new Date()), // Default createdAt
      new TrackingVisitorUpdatedAt(new Date()), // Default updatedAt
    );

    // Dispatch domain events if needed
    newTrackingVisitor.apply(
      new TrackingVisitorCreatedEvent(newTrackingVisitor.toPrimitives()),
    );

    return newTrackingVisitor;
  }

  toPrimitives(): TrackingVisitorPrimitives {
    return {
      id: this.id.value,
      name: this.name?.value || null,
      currentUrl: this.currentUrl?.value || null,
      connectionDuration: this.connectionDuration.value,
      ultimateConnectionDate: this.ultimateConnectionDate?.value || null,
      isConnected: this.isConnected.value,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}
