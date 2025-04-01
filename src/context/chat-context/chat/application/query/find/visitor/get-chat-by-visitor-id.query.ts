import { IQuery } from '@nestjs/cqrs';

export class GetChatByVisitorIdQuery implements IQuery {
  constructor(public readonly visitorId: string) {}
}
