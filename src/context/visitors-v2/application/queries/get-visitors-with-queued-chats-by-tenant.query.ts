import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener visitantes con chats en cola de un tenant específico
 */
export class GetVisitorsWithQueuedChatsByTenantQuery implements IQuery {
  constructor(
    readonly tenantId: string,
    readonly limit?: number,
    readonly offset?: number,
  ) {}

  static create(params: {
    tenantId: string;
    limit?: number;
    offset?: number;
  }): GetVisitorsWithQueuedChatsByTenantQuery {
    return new GetVisitorsWithQueuedChatsByTenantQuery(
      params.tenantId,
      params.limit,
      params.offset,
    );
  }
}
