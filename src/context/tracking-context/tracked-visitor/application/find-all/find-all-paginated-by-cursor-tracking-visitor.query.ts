// Query para obtener visitantes paginados por cursor
// Los comentarios explican el propósito de cada campo
import { IQuery } from '@nestjs/cqrs';

export class FindAllPaginatedByCursorTrackingVisitorQuery implements IQuery {
  // Número máximo de resultados a devolver
  readonly limit: number;
  // Lista de campos y direcciones para ordenar (soporta múltiples ordenamientos)
  readonly orderBy: { field: string; direction: 'ASC' | 'DESC' }[];
  // Lista de cursores para paginación compuesta (cada cursor tiene field y value)
  readonly cursor: string | null;
  // Filtros adicionales opcionales
  readonly filters?: Record<string, unknown>;

  constructor(params: {
    limit: number;
    orderBy: { field: string; direction: 'ASC' | 'DESC' }[];
    cursor?: string | null;
    filters?: Record<string, unknown>;
  }) {
    this.limit = params.limit;
    this.orderBy = params.orderBy;
    this.filters = params.filters;
    this.cursor = params.cursor ?? null;
  }
}
