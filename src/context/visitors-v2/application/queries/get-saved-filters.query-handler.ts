import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetSavedFiltersQuery } from './get-saved-filters.query';
import {
  SAVED_FILTER_REPOSITORY,
  SavedFilterRepository,
} from '../../domain/saved-filter.repository';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { SavedFilterPersistenceError } from '../../domain/errors/saved-filter.error';
import {
  SavedFiltersListResponseDto,
  SavedFilterResponseDto,
} from '../dtos/saved-filter.dto';
import { VisitorFiltersDto, VisitorSortDto } from '../dtos/visitor-filters.dto';

@QueryHandler(GetSavedFiltersQuery)
export class GetSavedFiltersQueryHandler
  implements IQueryHandler<GetSavedFiltersQuery>
{
  private readonly logger = new Logger(GetSavedFiltersQueryHandler.name);

  constructor(
    @Inject(SAVED_FILTER_REPOSITORY)
    private readonly savedFilterRepository: SavedFilterRepository,
  ) {}

  async execute(
    query: GetSavedFiltersQuery,
  ): Promise<Result<SavedFiltersListResponseDto, DomainError>> {
    this.logger.debug(
      `Obteniendo filtros guardados para usuario ${query.userId}`,
    );

    try {
      const userId = new Uuid(query.userId);
      const tenantId = new Uuid(query.tenantId);

      const result = await this.savedFilterRepository.findByUserAndTenant(
        userId,
        tenantId,
      );

      if (result.isErr()) {
        return err(result.error);
      }

      const savedFilters = result.unwrap();

      const filters: SavedFilterResponseDto[] = savedFilters.map((filter) => {
        const primitives = filter.toPrimitives();
        return {
          id: primitives.id,
          name: primitives.name,
          description: primitives.description || undefined,
          filters: primitives.filters as unknown as VisitorFiltersDto,
          sort: primitives.sort as unknown as VisitorSortDto | undefined,
          userId: primitives.userId,
          tenantId: primitives.tenantId,
          createdAt: primitives.createdAt,
          updatedAt: primitives.updatedAt,
        };
      });

      return ok({
        filters,
        total: filters.length,
      });
    } catch (error) {
      const errorMessage = `Error al obtener filtros guardados: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new SavedFilterPersistenceError(errorMessage));
    }
  }
}
