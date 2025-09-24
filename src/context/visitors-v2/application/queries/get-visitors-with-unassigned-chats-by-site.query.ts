import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener visitantes de un sitio que tienen chats no asignados
 */
export class GetVisitorsWithUnassignedChatsBySiteQuery implements IQuery {
  constructor(
    readonly siteId: string,
    readonly maxWaitTimeMinutes?: number,
    readonly limit?: number,
    readonly offset?: number,
  ) {}

  static create(params: {
    siteId: string;
    maxWaitTimeMinutes?: number;
    limit?: number;
    offset?: number;
  }): GetVisitorsWithUnassignedChatsBySiteQuery {
    return new GetVisitorsWithUnassignedChatsBySiteQuery(
      params.siteId,
      params.maxWaitTimeMinutes,
      params.limit,
      params.offset,
    );
  }
}
