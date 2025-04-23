import { IQuery } from '@nestjs/cqrs';

export class MessagePaginateQuery implements IQuery {
  constructor(
    readonly chatId: string,
    readonly cursor: string, // Se cambió 'index' por 'cursor'
    readonly limit: number,
  ) {}

  public static create(params: {
    chatId: string;
    cursor: string; // Se cambió 'index' por 'cursor'
    limit: number;
  }): MessagePaginateQuery {
    return new MessagePaginateQuery(params.chatId, params.cursor, params.limit);
  }
}
