import { IEvent } from '@nestjs/cqrs';
import { VisitorAccountPrimitives } from '../models/visitor-account.aggregate';

export class VisitorAccountCreatedEvent implements IEvent {
  constructor(
    public readonly visitorAccountPrimitive: VisitorAccountPrimitives,
  ) {}
}
