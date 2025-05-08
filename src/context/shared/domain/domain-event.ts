import { IEvent } from '@nestjs/cqrs';
import { Uuid } from './value-objects/uuid';

export abstract class DomainEvent<T = Record<string, any>> implements IEvent {
  private readonly _eventName: string;
  private readonly _id: Uuid;
  private readonly _timestamp: Date;
  private readonly _attributes: T;
  constructor(attributes: T) {
    this._eventName = this.constructor.name;
    this._id = Uuid.random();
    this._timestamp = new Date();
    this._attributes = attributes;
  }

  get id(): Uuid {
    return this._id;
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get attributes(): T {
    return this._attributes;
  }
}
