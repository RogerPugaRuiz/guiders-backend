import { IQuery } from '@nestjs/cqrs';

export class FindOneUserByIdQuery implements IQuery {
  constructor(readonly userId: string) {}
}
