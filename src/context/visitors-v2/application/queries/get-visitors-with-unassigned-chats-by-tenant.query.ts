import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener visitantes con chats sin asignar de un tenant específico
 */
export class GetVisitorsWithUnassignedChatsByTenantQuery implements IQuery {
  constructor(
    readonly tenantId: string,
    readonly limit?: number,
    readonly offset?: number,
  ) {}

  static create(params: {
    tenantId: string;
    limit?: number;
    offset?: number;
  }): GetVisitorsWithUnassignedChatsByTenantQuery {
    return new GetVisitorsWithUnassignedChatsByTenantQuery(
      params.tenantId,
      params.limit,
      params.offset,
    );
  }
}
