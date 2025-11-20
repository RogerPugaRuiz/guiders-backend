import { IQuery } from '@nestjs/cqrs';

export class GetVisitorActivityQuery implements IQuery {
  constructor(public readonly visitorId: string) {}
}
