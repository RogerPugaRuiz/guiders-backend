import { IQuery } from '@nestjs/cqrs';

export class GetChatByIdQuery implements IQuery {
  constructor(public readonly chatId: string) {}
}
