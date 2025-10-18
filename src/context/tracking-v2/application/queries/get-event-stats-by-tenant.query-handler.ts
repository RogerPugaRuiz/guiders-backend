import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetEventStatsByTenantQuery } from './get-event-stats-by-tenant.query';
import { EventStatsResponseDto } from '../dtos';
import {
  TrackingEventRepository,
  TRACKING_EVENT_REPOSITORY,
} from '../../domain/tracking-event.repository';
import { TenantId } from '../../domain/value-objects';

/**
 * Handler para obtener estadísticas de eventos por tenant
 */
@QueryHandler(GetEventStatsByTenantQuery)
export class GetEventStatsByTenantQueryHandler
  implements IQueryHandler<GetEventStatsByTenantQuery, EventStatsResponseDto>
{
  private readonly logger = new Logger(GetEventStatsByTenantQueryHandler.name);

  constructor(
    @Inject(TRACKING_EVENT_REPOSITORY)
    private readonly repository: TrackingEventRepository,
  ) {}

  async execute(
    query: GetEventStatsByTenantQuery,
  ): Promise<EventStatsResponseDto> {
    this.logger.log(
      `Obteniendo estadísticas de eventos para tenant=${query.tenantId}`,
    );

    const tenantId = new TenantId(query.tenantId);
    const result = await this.repository.getStatsByTenant(
      tenantId,
      query.dateFrom,
      query.dateTo,
    );

    if (result.isErr()) {
      this.logger.error(
        `Error al obtener estadísticas: ${result.error.message}`,
      );
      throw new Error(result.error.message);
    }

    const stats = result.value;

    return {
      totalEvents: stats.totalEvents,
      eventsByType: stats.eventsByType,
      uniqueVisitors: stats.uniqueVisitors,
      uniqueSessions: stats.uniqueSessions,
      dateRange: {
        from: stats.dateRange.from.toISOString(),
        to: stats.dateRange.to.toISOString(),
      },
    };
  }
}
