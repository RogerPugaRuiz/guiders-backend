import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener visitantes de un sitio que tienen chats en cola
 */
export class GetVisitorsWithQueuedChatsBySiteQuery implements IQuery {
  constructor(
    readonly siteId: string,
    readonly priorityFilter?: string[],
    readonly limit?: number,
    readonly offset?: number,
  ) {}

  static create(params: {
    siteId: string;
    priorityFilter?: string[];
    limit?: number;
    offset?: number;
  }): GetVisitorsWithQueuedChatsBySiteQuery {
    return new GetVisitorsWithQueuedChatsBySiteQuery(
      params.siteId,
      params.priorityFilter,
      params.limit,
      params.offset,
    );
  }
}
