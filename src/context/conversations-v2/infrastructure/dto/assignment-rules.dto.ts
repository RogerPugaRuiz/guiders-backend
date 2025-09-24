import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsArray,
  Min,
  Max,
  Matches,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentStrategy } from '../../domain/services/chat-auto-assignment.domain-service';

/**
 * DTO para horario de trabajo
 */
export class WorkingScheduleDto {
  @ApiProperty({
    description: 'Día de la semana (0 = domingo, 1 = lunes, etc.)',
    minimum: 0,
    maximum: 6,
    example: 1,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({
    description: 'Hora de inicio en formato HH:mm',
    example: '09:00',
  })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime debe estar en formato HH:mm',
  })
  startTime: string;

  @ApiProperty({
    description: 'Hora de fin en formato HH:mm',
    example: '17:00',
  })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime debe estar en formato HH:mm',
  })
  endTime: string;
}

/**
 * DTO para horarios de trabajo
 */
export class WorkingHoursDto {
  @ApiProperty({
    description: 'Zona horaria para los horarios de trabajo',
    example: 'America/Madrid',
  })
  @IsString()
  timezone: string;

  @ApiProperty({
    description: 'Horarios por día de la semana',
    type: [WorkingScheduleDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingScheduleDto)
  schedule: WorkingScheduleDto[];
}

/**
 * DTO para crear/actualizar reglas de asignamiento
 */
export class CreateAssignmentRulesDto {
  @ApiProperty({
    description: 'ID de la empresa',
    example: 'company-uuid-123',
  })
  @IsString()
  companyId: string;

  @ApiPropertyOptional({
    description:
      'ID del sitio específico (si no se proporciona, aplica a toda la empresa)',
    example: 'site-uuid-456',
  })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiProperty({
    description: 'Estrategia de asignamiento por defecto',
    enum: AssignmentStrategy,
    example: AssignmentStrategy.WORKLOAD_BALANCED,
  })
  @IsEnum(AssignmentStrategy)
  defaultStrategy: AssignmentStrategy;

  @ApiProperty({
    description: 'Número máximo de chats por comercial',
    minimum: 1,
    maximum: 50,
    example: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(50)
  maxChatsPerCommercial: number;

  @ApiProperty({
    description: 'Tiempo máximo de espera en segundos antes de fallback',
    minimum: 30,
    maximum: 3600,
    example: 300,
  })
  @IsNumber()
  @Min(30)
  @Max(3600)
  maxWaitTimeSeconds: number;

  @ApiProperty({
    description: 'Habilitar routing basado en habilidades',
    example: true,
  })
  @IsBoolean()
  enableSkillBasedRouting: boolean;

  @ApiPropertyOptional({
    description: 'Horarios de trabajo para auto-asignación',
    type: WorkingHoursDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto;

  @ApiProperty({
    description: 'Estrategia de fallback cuando no hay comerciales disponibles',
    enum: AssignmentStrategy,
    example: AssignmentStrategy.RANDOM,
  })
  @IsEnum(AssignmentStrategy)
  fallbackStrategy: AssignmentStrategy;

  @ApiProperty({
    description: 'Prioridades por skill (mayor número = mayor prioridad)',
    example: { ventas: 10, soporte: 8, tecnico: 9 },
  })
  @IsObject()
  priorities: { [skill: string]: number };

  @ApiProperty({
    description: 'Si las reglas están activas',
    example: true,
  })
  @IsBoolean()
  isActive: boolean;
}

/**
 * DTO para actualizar reglas existentes
 */
export class UpdateAssignmentRulesDto {
  @ApiPropertyOptional({
    description: 'Estrategia de asignamiento por defecto',
    enum: AssignmentStrategy,
  })
  @IsOptional()
  @IsEnum(AssignmentStrategy)
  defaultStrategy?: AssignmentStrategy;

  @ApiPropertyOptional({
    description: 'Número máximo de chats por comercial',
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxChatsPerCommercial?: number;

  @ApiPropertyOptional({
    description: 'Tiempo máximo de espera en segundos',
    minimum: 30,
    maximum: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(3600)
  maxWaitTimeSeconds?: number;

  @ApiPropertyOptional({
    description: 'Habilitar routing basado en habilidades',
  })
  @IsOptional()
  @IsBoolean()
  enableSkillBasedRouting?: boolean;

  @ApiPropertyOptional({
    description: 'Horarios de trabajo',
    type: WorkingHoursDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto;

  @ApiPropertyOptional({
    description: 'Estrategia de fallback',
    enum: AssignmentStrategy,
  })
  @IsOptional()
  @IsEnum(AssignmentStrategy)
  fallbackStrategy?: AssignmentStrategy;

  @ApiPropertyOptional({
    description: 'Prioridades por skill',
  })
  @IsOptional()
  @IsObject()
  priorities?: { [skill: string]: number };

  @ApiPropertyOptional({
    description: 'Si las reglas están activas',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO de respuesta para reglas de asignamiento
 */
export class AssignmentRulesResponseDto {
  @ApiProperty({ description: 'ID de la empresa' })
  companyId: string;

  @ApiPropertyOptional({ description: 'ID del sitio' })
  siteId?: string;

  @ApiProperty({
    description: 'Estrategia por defecto',
    enum: AssignmentStrategy,
  })
  defaultStrategy: AssignmentStrategy;

  @ApiProperty({ description: 'Máximo chats por comercial' })
  maxChatsPerCommercial: number;

  @ApiProperty({ description: 'Tiempo máximo de espera en segundos' })
  maxWaitTimeSeconds: number;

  @ApiProperty({ description: 'Routing basado en habilidades habilitado' })
  enableSkillBasedRouting: boolean;

  @ApiPropertyOptional({
    description: 'Horarios de trabajo',
    type: WorkingHoursDto,
  })
  workingHours?: WorkingHoursDto;

  @ApiProperty({
    description: 'Estrategia de fallback',
    enum: AssignmentStrategy,
  })
  fallbackStrategy: AssignmentStrategy;

  @ApiProperty({ description: 'Prioridades por skill' })
  priorities: { [skill: string]: number };

  @ApiProperty({ description: 'Si está activo' })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  updatedAt: Date;
}

/**
 * DTO para filtros de búsqueda
 */
export class AssignmentRulesFiltersDto {
  @ApiPropertyOptional({ description: 'Filtrar por empresa' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por sitio' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado activo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por estrategia',
    enum: AssignmentStrategy,
  })
  @IsOptional()
  @IsEnum(AssignmentStrategy)
  strategy?: AssignmentStrategy;
}
