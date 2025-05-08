import { IEvent } from '@nestjs/cqrs';
import { Uuid } from './value-objects/uuid';

export class DomainEvent implements IEvent {
  private readonly _eventName: string;
  private readonly _id: Uuid;
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
    this._id = Uuid.random();
    this._timestamp = params.timestamp;
    this._attributes = params.attributes;
  }

  get id(): Uuid {
    return this._id;
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get attributes(): { [key: string]: any } {
    return this._attributes;
  }
}
