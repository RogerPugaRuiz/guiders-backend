// Handler para la query de paginación por cursor de tracking-visitor
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedCursorTrackingVisitorQuery } from './paginated-cursor-tracking-visitor.query';
import { TrackingVisitorPaginationResponseDto } from './tracking-visitor-pagination-response.dto';
import { Inject } from '@nestjs/common';
import {
  ITrackingVisitorRepository,
  TRACKING_VISITOR_REPOSITORY,
} from '../../domain/tracking-visitor.repository';
import { TrackingVisitor } from '../../domain/tracking-visitor';
import { base64ToCursor } from 'src/context/shared/domain/cursor/base64-to-cursor.util';
import { cursorToBase64 } from 'src/context/shared/domain/cursor/cursor-to-base64.util';
import { CriteriaBuilder } from 'src/context/shared/domain/criteria-builder';
import { Criteria } from 'src/context/shared/domain/criteria';

@QueryHandler(PaginatedCursorTrackingVisitorQuery)
export class PaginatedCursorTrackingVisitorQueryHandler
  implements IQueryHandler<PaginatedCursorTrackingVisitorQuery>
{
  private criteriaBuilder = new CriteriaBuilder<TrackingVisitor>();
  constructor(
    @Inject(TRACKING_VISITOR_REPOSITORY)
    private readonly trackingVisitorRepository: ITrackingVisitorRepository,
  ) {}

  // Maneja la query de paginación por cursor
  async execute(
    query: PaginatedCursorTrackingVisitorQuery,
  ): Promise<TrackingVisitorPaginationResponseDto> {
    // Convertir el cursor de Base64 a un objeto Cursor
    const cursor = query.cursor
      ? base64ToCursor<TrackingVisitor>(query.cursor)
      : undefined;

    // Crear un Criteria basado en el cursor y los filtros de orden
    // let criteria = new Criteria<TrackingVisitor>().setLimit(query.limit);
    if (Array.isArray(query.orderBy)) {
      for (const order of query.orderBy) {
        this.criteriaBuilder.addOrderBy(
          order.field as keyof TrackingVisitor,
          order.direction,
        );
      }
    } else {
      // Si no hay orderBy, usar el orden por defecto
    }
    if (cursor) {
      // Si hay cursor, añadirlo a los criterios
      this.criteriaBuilder.setCursor(cursor);
    }

    // Usar el repositorio para obtener los resultados con un límite aumentado en 1
    this.criteriaBuilder.setLimit(query.limit + 1);
    const criteria = this.criteriaBuilder.build();
    const items = await this.trackingVisitorRepository.matcher(criteria);

    // Ajustar el cálculo de hasMore para verificar si hay más elementos
    const hasMore = items.length > query.limit;

    // Si hay más elementos, recortar la lista al límite original
    const paginatedItems = hasMore ? items.slice(0, query.limit) : items;

    // Construir la respuesta de paginación
    const lastItem = paginatedItems[paginatedItems.length - 1];

    // Convertir el cursor a Base64
    const newCursor: Record<string, unknown> = {};
    for (const order of query.orderBy) {
      if (!lastItem) {
        newCursor[order.field] = null;
        continue;
      }
      newCursor[order.field] = lastItem.toPrimitives()[order.field];
    }
    const newCursorBase64 = cursorToBase64(newCursor);

    const totalCriteria = new Criteria<TrackingVisitor>();
    const total = await this.trackingVisitorRepository.total(totalCriteria);

    return {
      items: paginatedItems.map((item) => item.toPrimitives()),
      total,
      nextCursor: hasMore ? newCursorBase64 : null,
      hasMore,
    };
  }
}
