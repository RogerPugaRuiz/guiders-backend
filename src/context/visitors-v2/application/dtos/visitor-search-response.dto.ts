import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Información de paginación en la respuesta
 */
export class PaginationInfoDto {
  @ApiProperty({
    description: 'Página actual',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Resultados por página',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total de resultados',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Total de páginas',
    example: 8,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Indica si hay página siguiente',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Indica si hay página anterior',
    example: false,
  })
  hasPreviousPage: boolean;
}

/**
 * Resumen de un visitante en la lista de resultados
 */
export class VisitorSummaryDto {
  @ApiProperty({
    description: 'ID del visitante',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'ID del tenant',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  tenantId: string;

  @ApiProperty({
    description: 'ID del sitio',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  siteId: string;

  @ApiProperty({
    description: 'Ciclo de vida del visitante',
    enum: ['ANON', 'ENGAGED', 'LEAD', 'CONVERTED'],
    example: 'LEAD',
  })
  lifecycle: string;

  @ApiProperty({
    description: 'Estado de conexión',
    enum: ['online', 'away', 'chatting', 'offline'],
    example: 'online',
  })
  connectionStatus: string;

  @ApiProperty({
    description: 'Ha aceptado política de privacidad',
    example: true,
  })
  hasAcceptedPrivacyPolicy: boolean;

  @ApiPropertyOptional({
    description: 'URL actual del visitante',
    example: 'https://example.com/pricing',
  })
  currentUrl?: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Última actividad',
    example: '2024-01-15T14:45:00.000Z',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'Número de sesiones activas',
    example: 1,
  })
  activeSessionsCount: number;

  @ApiProperty({
    description: 'Número total de sesiones',
    example: 5,
  })
  totalSessionsCount: number;

  @ApiProperty({
    description: 'Duración total de todas las sesiones en milisegundos',
    example: 3600000,
  })
  totalSessionDuration: number;

  @ApiProperty({
    description: 'Número total de chats asociados al visitante',
    example: 3,
  })
  totalChatsCount: number;

  @ApiProperty({
    description: 'IDs de chats pendientes (sin asignar) del visitante',
    type: [String],
    example: ['chat-uuid-1', 'chat-uuid-2'],
  })
  pendingChatIds: string[];
}

/**
 * Respuesta de búsqueda de visitantes
 */
export class SearchVisitorsResponseDto {
  @ApiProperty({
    description: 'Lista de visitantes que coinciden con los filtros',
    type: [VisitorSummaryDto],
  })
  visitors: VisitorSummaryDto[];

  @ApiProperty({
    description: 'Información de paginación',
    type: PaginationInfoDto,
  })
  pagination: PaginationInfoDto;

  @ApiPropertyOptional({
    description: 'Filtros aplicados (para referencia)',
    example: { lifecycle: ['LEAD'], connectionStatus: ['online'] },
  })
  appliedFilters?: Record<string, unknown>;
}

/**
 * Estadísticas de filtrado
 */
export class FilterStatsDto {
  @ApiProperty({
    description: 'Total de visitantes sin filtros',
    example: 1000,
  })
  totalVisitors: number;

  @ApiProperty({
    description: 'Visitantes que coinciden con los filtros',
    example: 150,
  })
  matchingVisitors: number;

  @ApiProperty({
    description: 'Porcentaje de coincidencia',
    example: 15.0,
  })
  matchPercentage: number;
}
