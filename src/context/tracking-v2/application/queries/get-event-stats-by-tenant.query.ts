import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener estadísticas de eventos por tenant
 */
export class GetEventStatsByTenantQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly dateFrom?: Date,
    public readonly dateTo?: Date,
  ) {}
}
