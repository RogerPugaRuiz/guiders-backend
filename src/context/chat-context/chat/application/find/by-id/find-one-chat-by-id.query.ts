import { IQuery } from '@nestjs/cqrs';

export class FindOneChatByIdQuery implements IQuery {
  constructor(readonly chatId: string) {}
}
