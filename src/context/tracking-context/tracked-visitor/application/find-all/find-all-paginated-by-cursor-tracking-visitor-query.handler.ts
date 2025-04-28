// Handler para la query de paginación por cursor de tracking-visitor
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindAllPaginatedByCursorTrackingVisitorQuery } from './find-all-paginated-by-cursor-tracking-visitor.query';
import { TrackingVisitorPaginationResponseDto } from './tracking-visitor-pagination-response.dto';
import { Inject } from '@nestjs/common';
import {
  ITrackingVisitorRepository,
  TRACKING_VISITOR_REPOSITORY,
} from '../../domain/tracking-visitor.repository';
import { Criteria } from 'src/context/shared/domain/criteria';
import { TrackingVisitor } from '../../domain/tracking-visitor';
import { base64ToCursor } from 'src/context/shared/domain/cursor/base64-to-cursor.util';

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
    // Convertir el cursor de Base64 a un objeto Cursor
    const cursor = query.cursor
      ? base64ToCursor<TrackingVisitor>(query.cursor as string)
      : undefined;

    // Crear un Criteria basado en el cursor y los filtros de orden
    const criteria = new Criteria<TrackingVisitor>().setLimit(query.limit);
    if (Array.isArray(query.orderBy)) {
      for (const order of query.orderBy) {
        criteria.orderByField(
          order.field as keyof TrackingVisitor,
          order.direction,
        );
      }
    }
    if (cursor) {
      // Si hay cursor, añadirlo a los criterios
      criteria.setCursor(cursor);
    }

    // Usar el repositorio para obtener los resultados
    const items = await this.trackingVisitorRepository.matcher(criteria);

    // Construir la respuesta de paginación
    const hasMore = items.length === query.limit;
    const nextCursor = hasMore ? items[items.length - 1] : null;

    return {
      items: items.map((item) => item.toPrimitives()),
      total: items.length,
      nextCursor: '',
      hasMore,
    };
  }
}
