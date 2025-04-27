// Handler para la query de paginación por cursor de tracking-visitor
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindAllPaginatedByCursorTrackingVisitorQuery } from './find-all-paginated-by-cursor-tracking-visitor.query';
import { TrackingVisitorPaginationResponseDto } from './tracking-visitor-pagination-response.dto';
import { Inject } from '@nestjs/common';
import {
  ITrackingVisitorRepository,
  TRACKING_VISITOR_REPOSITORY,
} from '../../domain/tracking-visitor.repository';
import { Criteria, Filter, Operator } from 'src/context/shared/domain/criteria';
import { TrackingVisitor } from '../../domain/tracking-visitor';

@QueryHandler(FindAllPaginatedByCursorTrackingVisitorQuery)
export class FindAllPaginatedByCursorTrackingVisitorQueryHandler
  implements IQueryHandler<FindAllPaginatedByCursorTrackingVisitorQuery>
{
  constructor(
    @Inject(TRACKING_VISITOR_REPOSITORY)
    private readonly trackingVisitorRepository: ITrackingVisitorRepository,
  ) {}

  // Maneja la query de paginación por cursor
  async execute(
    query: FindAllPaginatedByCursorTrackingVisitorQuery,
  ): Promise<TrackingVisitorPaginationResponseDto> {
    // Construye los filtros a partir de query.filters
    const filters: Filter<TrackingVisitor>[] = [];
    if (query.filters) {
      for (const [field, value] of Object.entries(query.filters)) {
        if (value === null) {
          filters.push(
            new Filter(field as keyof TrackingVisitor, Operator.IS_NULL),
          );
        } else {
          filters.push(
            new Filter(field as keyof TrackingVisitor, Operator.EQUALS, value),
          );
        }
      }
    }

    // Construye la lista de ordenamientos (soporta múltiples ordenes)
    let orderByList: {
      field: keyof TrackingVisitor;
      direction: 'ASC' | 'DESC';
    }[] = [];
    if (Array.isArray(query.orderBy)) {
      orderByList = query.orderBy
        .filter(
          (o): o is { field: string; direction: 'ASC' | 'DESC' } =>
            typeof o === 'object' &&
            typeof o.field === 'string' &&
            (o.direction === 'ASC' || o.direction === 'DESC'),
        )
        .map((o) => ({
          field: o.field as keyof TrackingVisitor,
          direction: o.direction,
        }));
    }
    if (!orderByList.some((o) => o.field === 'id')) {
      orderByList.push({
        field: 'id' as keyof TrackingVisitor,
        direction: orderByList[0]?.direction || 'DESC',
      });
    }

    // Construye los cursores para paginación compuesta (cada cursor tiene field y value)
    let cursorList:
      | { field: keyof TrackingVisitor; value: unknown }[]
      | undefined = undefined;
    if (Array.isArray(query.cursors) && query.cursors.length > 0) {
      cursorList = query.cursors.map((c) => ({
        field: c.field as keyof TrackingVisitor,
        value: c.value,
      }));
    }

    // Crea el criteria con filtros, orden, límite y cursores
    let criteria = new Criteria<TrackingVisitor>(filters)
      .setOrderBy(orderByList)
      .setLimit(query.limit);
    if (cursorList) {
      criteria = criteria.setCursor(cursorList);
    }

    // Consulta el repositorio
    const visitors = await this.trackingVisitorRepository.matcher(criteria);

    // Determina el nextCursor y hasMore
    let nextCursor: { field: string; value: unknown }[] | null = null;
    let hasMore = false;
    if (visitors.length === query.limit) {
      hasMore = true;
      const last = visitors[visitors.length - 1].toPrimitives();
      nextCursor = orderByList.map((o) => ({
        field: o.field as string,
        value: last[o.field as keyof typeof last],
      }));
    }

    // Devuelve el DTO de respuesta actualizado
    return new TrackingVisitorPaginationResponseDto({
      items: visitors.map((v) => v.toPrimitives()),
      nextCursor,
      hasMore,
    });
  }
}
