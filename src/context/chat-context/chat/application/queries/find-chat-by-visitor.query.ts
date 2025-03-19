import { IQuery } from '@nestjs/cqrs';

export class FindChatByVisitorQuery implements IQuery {
  constructor(public readonly visitorId: string) {}
}
