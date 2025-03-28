import { IQuery } from '@nestjs/cqrs';

export class FindOneUserBySocketIdQuery implements IQuery {
  constructor(public readonly socketId: string) {}
}
