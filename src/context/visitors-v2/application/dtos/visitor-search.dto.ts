import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== SCHEMA ====================

export class SearchFieldDto {
  @ApiProperty({ description: 'Clave del campo para usar en la búsqueda' })
  key: string;

  @ApiProperty({ description: 'Etiqueta legible del campo' })
  label: string;

  @ApiProperty({
    description: 'Tipo de campo',
    enum: ['select', 'text', 'date', 'boolean', 'number'],
  })
  type: string;

  @ApiPropertyOptional({
    description: 'Valores posibles para campos de tipo select',
    type: [String],
  })
  values?: string[];

  @ApiProperty({
    description: 'Operadores soportados',
    type: [String],
    example: [':', '>', '<', '>=', '<=', '!='],
  })
  operators: string[];
}

export class SearchSchemaResponseDto {
  @ApiProperty({ type: [SearchFieldDto] })
  fields: SearchFieldDto[];
}

// ==================== SUGGESTIONS ====================

export class SearchSuggestionsQueryDto {
  @ApiProperty({
    description: 'Query parcial para obtener sugerencias',
    example: 'status:',
  })
  @IsString()
  q: string;
}

export class SuggestionItemDto {
  @ApiProperty({
    description: 'Tipo de sugerencia',
    enum: ['field', 'value', 'operator'],
  })
  type: 'field' | 'value' | 'operator';

  @ApiProperty({
    description: 'Valor a insertar en la búsqueda',
    example: 'status:online',
  })
  value: string;

  @ApiProperty({
    description: 'Etiqueta legible para mostrar',
    example: 'Estado: Online',
  })
  label: string;
}

export class SearchSuggestionsResponseDto {
  @ApiProperty({ type: [SuggestionItemDto] })
  suggestions: SuggestionItemDto[];
}

// ==================== SEARCH ====================

export class VisitorSearchQueryDto {
  @ApiProperty({
    description:
      'Query de búsqueda con sintaxis de filtros. Ejemplo: status:online lifecycle:LEAD',
    example: 'status:online lifecycle:LEAD',
  })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    description: 'Número de resultados a devolver',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Offset para paginación',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Campo por el que ordenar',
    default: 'updatedAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'updatedAt';

  @ApiPropertyOptional({
    description: 'Dirección de ordenamiento',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class VisitorSearchResultItemDto {
  @ApiProperty({ description: 'ID del visitante' })
  id: string;

  @ApiProperty({ description: 'Estado de conexión' })
  connectionStatus: string;

  @ApiProperty({ description: 'Ciclo de vida' })
  lifecycle: string;

  @ApiPropertyOptional({ description: 'URL actual' })
  currentUrl?: string;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Última actualización' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Última actividad de sesión' })
  lastActivity?: Date;

  @ApiProperty({ description: 'Consentimiento RGPD aceptado' })
  hasAcceptedPrivacyPolicy: boolean;
}

export class VisitorSearchResponseDto {
  @ApiProperty({ type: [VisitorSearchResultItemDto] })
  results: VisitorSearchResultItemDto[];

  @ApiProperty({ description: 'Total de resultados' })
  totalCount: number;

  @ApiProperty({ description: 'Query parseada para debugging' })
  parsedQuery: {
    filters: Array<{ field: string; operator: string; value: string }>;
    freeText: string;
  };
}

// ==================== HISTORY ====================

export class SearchHistoryItemDto {
  @ApiProperty({ description: 'ID del registro de historial' })
  id: string;

  @ApiProperty({ description: 'Query ejecutada' })
  query: string;

  @ApiProperty({ description: 'Número de resultados' })
  resultsCount: number;

  @ApiProperty({ description: 'Fecha de ejecución' })
  executedAt: Date;
}

export class SearchHistoryResponseDto {
  @ApiProperty({ type: [SearchHistoryItemDto] })
  history: SearchHistoryItemDto[];
}

// ==================== SAVED SEARCHES ====================

export class CreateSavedSearchDto {
  @ApiProperty({
    description: 'Query de búsqueda a guardar',
    example: 'status:online lifecycle:LEAD',
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Nombre descriptivo para la búsqueda guardada',
    example: 'Leads activos',
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class SavedSearchItemDto {
  @ApiProperty({ description: 'ID de la búsqueda guardada' })
  id: string;

  @ApiProperty({ description: 'Query de búsqueda' })
  query: string;

  @ApiPropertyOptional({ description: 'Nombre descriptivo' })
  name?: string;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;
}

export class SavedSearchesResponseDto {
  @ApiProperty({ type: [SavedSearchItemDto] })
  savedSearches: SavedSearchItemDto[];
}

export class DeleteSavedSearchParamsDto {
  @ApiProperty({ description: 'ID de la búsqueda guardada a eliminar' })
  @IsUUID()
  id: string;
}
