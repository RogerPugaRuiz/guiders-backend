import { Uuid } from '../../../shared/domain/value-objects/uuid';

/**
 * Value Object para el ID único del evento de tracking
 */
export class TrackingEventId extends Uuid {
  constructor(value: string) {
    super(value);
  }

  public static random(): TrackingEventId {
    return new TrackingEventId(Uuid.generate());
  }
}
