import { IQuery } from '@nestjs/cqrs';
import { ChatFiltersDto, ChatSortDto } from '../dtos/chat-query.dto';

/**
 * Query para obtener chats con filtros avanzados y paginación con cursor
 */
export class GetChatsWithFiltersQuery implements IQuery {
  constructor(
    readonly userId: string,
    readonly userRoles: string[],
    readonly filters?: ChatFiltersDto,
    readonly sort?: ChatSortDto,
    readonly cursor?: string,
    readonly limit?: number,
  ) {}

  public static create(params: {
    userId: string;
    userRoles: string[];
    filters?: ChatFiltersDto;
    sort?: ChatSortDto;
    cursor?: string;
    limit?: number;
  }): GetChatsWithFiltersQuery {
    return new GetChatsWithFiltersQuery(
      params.userId,
      params.userRoles,
      params.filters,
      params.sort,
      params.cursor,
      params.limit,
    );
  }
}
