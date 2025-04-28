// DTO para la respuesta de paginación por cursor de tracking-visitor
// Incluye los visitantes, el cursor siguiente y si hay más resultados
import { TrackingVisitorPrimitives } from '../../domain/tracking-visitor-primitives';

/**
 * DTO para la respuesta de paginación por cursor.
 * nextCursor ahora soporta múltiples cursores (array de { field, value }) o null si no hay más.
 */
export class TrackingVisitorPaginationResponseDto {
  // Lista de visitantes en formato primitivo
  readonly items: TrackingVisitorPrimitives[];
  // Cursor para la siguiente página (array de { field, value } o null si no hay más)
  readonly nextCursor: string | null;
  // Indica si hay más resultados
  readonly hasMore: boolean;
  readonly total: number;

  constructor(params: {
    items: TrackingVisitorPrimitives[];
    nextCursor: string | null;
    hasMore: boolean;
    total: number;
  }) {
    this.items = params.items;
    this.nextCursor = params.nextCursor;
    this.hasMore = params.hasMore;
    this.total = params.total;
  }
}
