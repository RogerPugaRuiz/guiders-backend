import { IQuery } from '@nestjs/cqrs';

export class FindAvailableChatsQuery implements IQuery {
  constructor(
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}
