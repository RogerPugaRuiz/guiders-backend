import { IQuery } from '@nestjs/cqrs';

export class FindChatListWithFiltersQuery implements IQuery {
  constructor(
    readonly participantId: string,
    readonly limit?: number,
    readonly include?: string[], // Campos adicionales a incluir como lastMessage, timestamp, unreadCount
  ) {}

  public static create(params: {
    participantId: string;
    limit?: number;
    include?: string[];
  }): FindChatListWithFiltersQuery {
    return new FindChatListWithFiltersQuery(
      params.participantId,
      params.limit,
      params.include,
    );
  }
}
