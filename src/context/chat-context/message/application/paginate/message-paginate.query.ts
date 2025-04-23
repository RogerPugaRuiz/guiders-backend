import { IQuery } from '@nestjs/cqrs';

export class MessagePaginateQuery implements IQuery {
  constructor(
    readonly chatId: string,
    readonly limit: number,
    readonly cursor?: string, // Se cambió 'index' por 'cursor'
  ) {}

  public static create(params: {
    chatId: string;
    limit: number;
    cursor?: string; // Se cambió 'index' por 'cursor'
  }): MessagePaginateQuery {
    return new MessagePaginateQuery(params.chatId, params.limit, params.cursor);
  }
}
