import { IEvent } from '@nestjs/cqrs';
import { UUID } from './value-objects/uuid';

export class DomainEvent implements IEvent {
  private readonly _eventName: string;
  private readonly _id: UUID;
  private readonly _timestamp: Date;
  private readonly _attributes: { [key: string]: any };
  constructor(
    readonly params: {
      timestamp: Date;
      attributes: {
        [key: string]: any;
      };
    },
  ) {
    this._eventName = this.constructor.name;
    this._id = UUID.random();
    this._timestamp = params.timestamp;
    this._attributes = params.attributes;
  }

  get id(): UUID {
    return this._id;
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get attributes(): { [key: string]: any } {
    return this._attributes;
  }
}
