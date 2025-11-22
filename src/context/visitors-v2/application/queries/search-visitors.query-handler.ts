import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { SearchVisitorsQuery } from './search-visitors.query';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
  VisitorSearchFilters,
  VisitorSearchSort,
  VisitorSearchPagination,
} from '../../domain/visitor-v2.repository';
import { TenantId } from '../../domain/value-objects/tenant-id';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { VisitorV2PersistenceError } from '../../domain/errors/visitor-v2.error';
import {
  SearchVisitorsResponseDto,
  VisitorSummaryDto,
  PaginationInfoDto,
} from '../dtos/visitor-search-response.dto';
import { VisitorSortField, SortDirection } from '../dtos/visitor-filters.dto';

@QueryHandler(SearchVisitorsQuery)
export class SearchVisitorsQueryHandler
  implements IQueryHandler<SearchVisitorsQuery>
{
  private readonly logger = new Logger(SearchVisitorsQueryHandler.name);

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
  ) {}

  async execute(
    query: SearchVisitorsQuery,
  ): Promise<Result<SearchVisitorsResponseDto, DomainError>> {
    this.logger.debug(
      `Buscando visitantes con filtros para tenant ${query.tenantId}`,
    );

    try {
      // Convertir DTOs a interfaces del repositorio
      const filters = this.mapFilters(query.filters);
      const sort = this.mapSort(query.sort);
      const pagination = this.mapPagination(query.pagination);

      // Ejecutar búsqueda
      const result = await this.visitorRepository.searchWithFilters(
        new TenantId(query.tenantId),
        filters,
        sort,
        pagination,
      );

      if (result.isErr()) {
        return err(result.error);
      }

      const searchResult = result.unwrap();

      // Mapear a DTOs de respuesta
      const visitors: VisitorSummaryDto[] = searchResult.visitors.map(
        (visitor) => {
          const primitives = visitor.toPrimitives();
          return {
            id: primitives.id,
            tenantId: primitives.tenantId,
            siteId: primitives.siteId,
            lifecycle: primitives.lifecycle,
            connectionStatus: primitives.connectionStatus || 'offline',
            hasAcceptedPrivacyPolicy: primitives.hasAcceptedPrivacyPolicy,
            currentUrl: primitives.currentUrl,
            createdAt: primitives.createdAt,
            updatedAt: primitives.updatedAt,
            activeSessionsCount: primitives.sessions.filter(
              (s) => s.endedAt === null,
            ).length,
            totalSessionsCount: primitives.sessions.length,
          };
        },
      );

      const paginationInfo: PaginationInfoDto = {
        page: searchResult.page,
        limit: searchResult.limit,
        total: searchResult.total,
        totalPages: searchResult.totalPages,
        hasNextPage: searchResult.page < searchResult.totalPages,
        hasPreviousPage: searchResult.page > 1,
      };

      return ok({
        visitors,
        pagination: paginationInfo,
        appliedFilters: query.filters as unknown as Record<string, unknown>,
      });
    } catch (error) {
      const errorMessage = `Error en búsqueda de visitantes: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  private mapFilters(
    dto: SearchVisitorsQuery['filters'],
  ): VisitorSearchFilters {
    return {
      lifecycle: dto.lifecycle,
      connectionStatus: dto.connectionStatus,
      hasAcceptedPrivacyPolicy: dto.hasAcceptedPrivacyPolicy,
      createdFrom: dto.createdFrom ? new Date(dto.createdFrom) : undefined,
      createdTo: dto.createdTo ? new Date(dto.createdTo) : undefined,
      lastActivityFrom: dto.lastActivityFrom
        ? new Date(dto.lastActivityFrom)
        : undefined,
      lastActivityTo: dto.lastActivityTo
        ? new Date(dto.lastActivityTo)
        : undefined,
      siteIds: dto.siteIds,
      currentUrlContains: dto.currentUrlContains,
      hasActiveSessions: dto.hasActiveSessions,
    };
  }

  private mapSort(dto: SearchVisitorsQuery['sort']): VisitorSearchSort {
    const fieldMap: Record<VisitorSortField, VisitorSearchSort['field']> = {
      [VisitorSortField.CREATED_AT]: 'createdAt',
      [VisitorSortField.UPDATED_AT]: 'updatedAt',
      [VisitorSortField.LAST_ACTIVITY]: 'updatedAt',
      [VisitorSortField.LIFECYCLE]: 'lifecycle',
      [VisitorSortField.CONNECTION_STATUS]: 'connectionStatus',
    };

    return {
      field: fieldMap[dto.field] || 'updatedAt',
      direction: dto.direction === SortDirection.ASC ? 'ASC' : 'DESC',
    };
  }

  private mapPagination(
    dto: SearchVisitorsQuery['pagination'],
  ): VisitorSearchPagination {
    return {
      page: dto.page || 1,
      limit: dto.limit || 20,
    };
  }
}
