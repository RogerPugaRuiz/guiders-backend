import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min, IsEnum } from 'class-validator';

/**
 * Campos disponibles para ordenamiento
 */
export enum SortField {
  LAST_ACTIVITY = 'lastActivity',
  CREATED_AT = 'createdAt',
  CONNECTION_STATUS = 'connectionStatus',
}

/**
 * Orden de clasificación
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * DTO para parámetros de consulta de visitantes del tenant
 */
export class TenantVisitorsQueryDto {
  @ApiProperty({
    description: 'Incluir visitantes offline',
    required: false,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: string | boolean }): boolean => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return Boolean(value);
  })
  includeOffline?: boolean = false;

  @ApiProperty({
    description: 'Número máximo de visitantes a retornar',
    required: false,
    minimum: 1,
    maximum: 100,
    default: 50,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser mayor a 0' })
  limit?: number = 50;

  @ApiProperty({
    description: 'Número de visitantes a omitir (paginación)',
    required: false,
    minimum: 0,
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El offset debe ser un número entero' })
  @Min(0, { message: 'El offset debe ser mayor o igual a 0' })
  offset?: number = 0;

  @ApiProperty({
    description: 'Campo por el cual ordenar los resultados',
    required: false,
    enum: SortField,
    default: SortField.LAST_ACTIVITY,
    example: SortField.LAST_ACTIVITY,
  })
  @IsOptional()
  @IsEnum(SortField, {
    message:
      'El campo de ordenamiento debe ser "lastActivity", "createdAt" o "connectionStatus"',
  })
  sortBy?: SortField = SortField.LAST_ACTIVITY;

  @ApiProperty({
    description:
      'Orden de clasificación: ascendente (asc) o descendente (desc)',
    required: false,
    enum: SortOrder,
    default: SortOrder.DESC,
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'El orden debe ser "asc" o "desc"' })
  sortOrder?: SortOrder = SortOrder.DESC;
}

/**
 * DTO para parámetros de consulta de visitantes con chats sin asignar del tenant
 */
export class TenantVisitorsUnassignedChatsQueryDto {
  @ApiProperty({
    description: 'Número máximo de visitantes a retornar',
    required: false,
    minimum: 1,
    maximum: 100,
    default: 50,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser mayor a 0' })
  limit?: number = 50;

  @ApiProperty({
    description: 'Número de visitantes a omitir (paginación)',
    required: false,
    minimum: 0,
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El offset debe ser un número entero' })
  @Min(0, { message: 'El offset debe ser mayor o igual a 0' })
  offset?: number = 0;
}

/**
 * DTO para parámetros de consulta de visitantes con chats en cola del tenant
 */
export class TenantVisitorsQueuedChatsQueryDto {
  @ApiProperty({
    description: 'Número máximo de visitantes a retornar',
    required: false,
    minimum: 1,
    maximum: 100,
    default: 50,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser mayor a 0' })
  limit?: number = 50;

  @ApiProperty({
    description: 'Número de visitantes a omitir (paginación)',
    required: false,
    minimum: 0,
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El offset debe ser un número entero' })
  @Min(0, { message: 'El offset debe ser mayor o igual a 0' })
  offset?: number = 0;
}
