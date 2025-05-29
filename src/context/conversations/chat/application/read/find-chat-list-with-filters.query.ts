import { IQuery } from '@nestjs/cqrs';

export class FindChatListWithFiltersQuery implements IQuery {
  constructor(
    readonly participantId: string,
    readonly limit?: number,
    readonly include?: string[], // Campos adicionales a incluir como lastMessage, timestamp, unreadCount
    readonly cursor?: string, // Cursor para paginación
  ) {}

  public static create(params: {
    participantId: string;
    limit?: number;
    include?: string[];
    cursor?: string;
  }): FindChatListWithFiltersQuery {
    return new FindChatListWithFiltersQuery(
      params.participantId,
      params.limit,
      params.include,
      params.cursor,
    );
  }
}
