import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  ValidateNested,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';
import {
  VisitorFiltersDto,
  VisitorSortDto,
  FilterLogic,
  AdvancedFilterDto,
} from './visitor-filters.dto';

/**
 * DTO para crear un nuevo filtro guardado
 */
export class CreateSavedFilterDto {
  @ApiProperty({
    description: 'Nombre del filtro guardado',
    example: 'Leads de esta semana',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del filtro',
    example: 'Filtro para ver leads activos de la semana actual',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Configuración de filtros',
    type: VisitorFiltersDto,
  })
  @ValidateNested()
  @Type(() => VisitorFiltersDto)
  filters: VisitorFiltersDto;

  @ApiPropertyOptional({
    description: 'Configuración de ordenamiento',
    type: VisitorSortDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VisitorSortDto)
  sort?: VisitorSortDto;
}

/**
 * DTO para crear un filtro guardado con filtros avanzados
 */
export class CreateAdvancedSavedFilterDto {
  @ApiProperty({
    description: 'Nombre del filtro guardado',
    example: 'Búsqueda avanzada personalizada',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del filtro',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Filtros avanzados',
    type: [AdvancedFilterDto],
  })
  @ValidateNested({ each: true })
  @Type(() => AdvancedFilterDto)
  filters: AdvancedFilterDto[];

  @ApiPropertyOptional({
    description: 'Lógica de combinación',
    enum: FilterLogic,
    default: FilterLogic.AND,
  })
  @IsOptional()
  @IsEnum(FilterLogic)
  logic?: FilterLogic;

  @ApiPropertyOptional({
    description: 'Configuración de ordenamiento',
    type: VisitorSortDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VisitorSortDto)
  sort?: VisitorSortDto;
}

/**
 * DTO para actualizar un filtro guardado
 */
export class UpdateSavedFilterDto {
  @ApiPropertyOptional({
    description: 'Nuevo nombre del filtro',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Nueva descripción',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Nueva configuración de filtros',
    type: VisitorFiltersDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VisitorFiltersDto)
  filters?: VisitorFiltersDto;

  @ApiPropertyOptional({
    description: 'Nueva configuración de ordenamiento',
    type: VisitorSortDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VisitorSortDto)
  sort?: VisitorSortDto;
}

/**
 * Respuesta de un filtro guardado
 */
export class SavedFilterResponseDto {
  @ApiProperty({
    description: 'ID único del filtro guardado',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del filtro',
    example: 'Leads de esta semana',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del filtro',
    example: 'Filtro para ver leads activos de la semana actual',
  })
  description?: string;

  @ApiProperty({
    description: 'Configuración de filtros',
    type: VisitorFiltersDto,
  })
  filters: VisitorFiltersDto;

  @ApiPropertyOptional({
    description: 'Configuración de ordenamiento',
    type: VisitorSortDto,
  })
  sort?: VisitorSortDto;

  @ApiProperty({
    description: 'ID del usuario que creó el filtro',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiProperty({
    description: 'ID del tenant',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: string;
}

/**
 * Lista de filtros guardados
 */
export class SavedFiltersListResponseDto {
  @ApiProperty({
    description: 'Lista de filtros guardados',
    type: [SavedFilterResponseDto],
  })
  filters: SavedFilterResponseDto[];

  @ApiProperty({
    description: 'Total de filtros guardados',
    example: 5,
  })
  total: number;
}
