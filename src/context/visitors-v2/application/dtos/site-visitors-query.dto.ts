import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

/**
 * DTO para parámetros de consulta de visitantes del sitio
 */
export class SiteVisitorsQueryDto {
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
}

/**
 * DTO para parámetros de consulta de visitantes con chats sin asignar
 */
export class SiteVisitorsUnassignedChatsQueryDto {
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
 * DTO para parámetros de consulta de visitantes con chats en cola
 */
export class SiteVisitorsQueuedChatsQueryDto {
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
