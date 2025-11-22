import { IQuery } from '@nestjs/cqrs';
import {
  VisitorFiltersDto,
  VisitorSortDto,
  VisitorPaginationDto,
} from '../dtos/visitor-filters.dto';

/**
 * Query para buscar visitantes con filtros complejos
 */
export class SearchVisitorsQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly filters: VisitorFiltersDto,
    public readonly sort: VisitorSortDto,
    public readonly pagination: VisitorPaginationDto,
  ) {}
}
