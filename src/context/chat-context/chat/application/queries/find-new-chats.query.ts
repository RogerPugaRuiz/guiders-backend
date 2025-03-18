import { IQuery } from '@nestjs/cqrs';

export class FindNewChatsQuery implements IQuery {
  constructor() {}
}
