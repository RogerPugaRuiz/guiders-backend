import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetQuickFiltersConfigQuery } from './get-quick-filters-config.query';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
  VisitorSearchFilters,
} from '../../domain/visitor-v2.repository';
import { TenantId } from '../../domain/value-objects/tenant-id';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { VisitorV2PersistenceError } from '../../domain/errors/visitor-v2.error';
import {
  QuickFiltersConfigResponseDto,
  QuickFilterConfigDto,
  QuickFilterId,
  QUICK_FILTER_DEFINITIONS,
} from '../dtos/quick-filters.dto';

@QueryHandler(GetQuickFiltersConfigQuery)
export class GetQuickFiltersConfigQueryHandler
  implements IQueryHandler<GetQuickFiltersConfigQuery>
{
  private readonly logger = new Logger(GetQuickFiltersConfigQueryHandler.name);

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
  ) {}

  async execute(
    query: GetQuickFiltersConfigQuery,
  ): Promise<Result<QuickFiltersConfigResponseDto, DomainError>> {
    this.logger.debug(
      `Obteniendo configuración de filtros rápidos para tenant ${query.tenantId}`,
    );

    try {
      const tenantId = new TenantId(query.tenantId);
      const filters: QuickFilterConfigDto[] = [];

      // Obtener contadores para cada filtro rápido
      for (const [id, definition] of Object.entries(QUICK_FILTER_DEFINITIONS)) {
        const filterConfig = definition.getFilters();
        const searchFilters = this.mapToSearchFilters(filterConfig);

        const countResult = await this.visitorRepository.countWithFilters(
          tenantId,
          searchFilters,
        );

        const count = countResult.isOk() ? countResult.unwrap() : 0;

        filters.push({
          id: id as QuickFilterId,
          label: definition.label,
          description: definition.description,
          icon: definition.icon,
          count,
        });
      }

      return ok({
        filters,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage = `Error al obtener configuración de filtros rápidos: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  private mapToSearchFilters(
    filterConfig: Record<string, unknown>,
  ): VisitorSearchFilters {
    const result: VisitorSearchFilters = {};

    if (filterConfig.lifecycle) {
      result.lifecycle = filterConfig.lifecycle as string[];
    }

    if (filterConfig.connectionStatus) {
      result.connectionStatus = filterConfig.connectionStatus as string[];
    }

    if (filterConfig.hasActiveSessions !== undefined) {
      result.hasActiveSessions = filterConfig.hasActiveSessions as boolean;
    }

    if (filterConfig.lastActivityFrom) {
      result.lastActivityFrom = new Date(
        filterConfig.lastActivityFrom as string,
      );
    }

    if (filterConfig.lastActivityTo) {
      result.lastActivityTo = new Date(filterConfig.lastActivityTo as string);
    }

    if (filterConfig.minTotalSessionsCount !== undefined) {
      result.minTotalSessionsCount =
        filterConfig.minTotalSessionsCount as number;
    }

    if (filterConfig.maxTotalSessionsCount !== undefined) {
      result.maxTotalSessionsCount =
        filterConfig.maxTotalSessionsCount as number;
    }

    return result;
  }
}
