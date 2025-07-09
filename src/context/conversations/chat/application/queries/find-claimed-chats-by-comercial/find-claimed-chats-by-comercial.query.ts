import { IQuery } from '@nestjs/cqrs';

export class FindClaimedChatsByComercialQuery implements IQuery {
  constructor(public readonly comercialId: string) {}
}
