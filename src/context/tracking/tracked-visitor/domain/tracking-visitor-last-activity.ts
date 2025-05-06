import { TrackingVisitorLastActivityDate } from './value-objects/tracking-visitor-last-activity-date';
import { TrackingVisitorLastActivityDescription } from './value-objects/tracking-visitor-last-activity-description';

export class TrackingVisitorLastActivity {
  constructor(
    public readonly date: TrackingVisitorLastActivityDate,
    public readonly description: TrackingVisitorLastActivityDescription,
  ) {}

  getDate(): TrackingVisitorLastActivityDate {
    return this.date;
  }

  getDescription(): TrackingVisitorLastActivityDescription {
    return this.description;
  }

  toString(): string {
    return `${this.description.value} on ${this.date.value.toISOString()}`;
  }

  toPrimitives(): {
    date: Date;
    description: string;
  } {
    return {
      date: this.date.value,
      description: this.description.value,
    };
  }
}
