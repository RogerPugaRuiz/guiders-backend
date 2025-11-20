import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener todos los visitantes de un tenant específico (todos los sitios de la empresa)
 */
export class GetVisitorsByTenantQuery implements IQuery {
  constructor(
    readonly tenantId: string,
    readonly includeOffline: boolean = false,
    readonly limit?: number,
    readonly offset?: number,
    readonly sortBy?: string,
    readonly sortOrder?: string,
  ) {}

  static create(params: {
    tenantId: string;
    includeOffline?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
  }): GetVisitorsByTenantQuery {
    return new GetVisitorsByTenantQuery(
      params.tenantId,
      params.includeOffline ?? false,
      params.limit,
      params.offset,
      params.sortBy,
      params.sortOrder,
    );
  }
}
