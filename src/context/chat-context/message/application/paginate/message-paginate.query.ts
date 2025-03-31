import { IQuery } from '@nestjs/cqrs';

export class MessagePaginateQuery implements IQuery {
  constructor(
    readonly chatId: string,
    readonly index: string,
    readonly limit: number,
  ) {}

  public static create(params: {
    chatId: string;
    index: string;
    limit: number;
  }): MessagePaginateQuery {
    return new MessagePaginateQuery(params.chatId, params.index, params.limit);
  }
}
