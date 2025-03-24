import { IQuery } from '@nestjs/cqrs';

export class ExistsChatQuery implements IQuery {
  constructor(public readonly chatId: string) {}
}
