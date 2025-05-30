import { IEvent } from '@nestjs/cqrs';
import { VisitorAccountPrimitives } from '../models/visitor-account';

export class VisitorAccountCreatedEvent implements IEvent {
  constructor(
    public readonly visitorAccountPrimitive: VisitorAccountPrimitives,
  ) {}
}
