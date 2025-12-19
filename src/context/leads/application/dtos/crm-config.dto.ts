import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CrmType } from '../../domain/services/crm-sync.service';

/**
 * DTO para configuración específica de LeadCars
 */
export class LeadcarsConfigDto {
  @ApiProperty({
    description: 'Token de cliente para autenticación con LeadCars',
    example: 'abc123token',
  })
  @IsString()
  clienteToken: string;

  @ApiPropertyOptional({
    description: 'Usar entorno sandbox en lugar de producción',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  useSandbox?: boolean;

  @ApiProperty({
    description: 'ID del concesionario en LeadCars',
    example: 123,
  })
  @IsNumber()
  @Min(1)
  concesionarioId: number;

  @ApiPropertyOptional({
    description: 'ID de la sede (opcional)',
    example: 456,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  sedeId?: number;

  @ApiPropertyOptional({
    description: 'ID de la campaña (opcional)',
    example: 789,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  campanaId?: number;

  @ApiPropertyOptional({
    description: 'Tipo de lead por defecto',
    example: 'web',
    default: 'web',
  })
  @IsOptional()
  @IsString()
  tipoLeadDefault?: string;
}

/**
 * DTO para crear/actualizar configuración de CRM
 */
export class CreateCrmConfigDto {
  @ApiProperty({
    description: 'ID de la empresa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  companyId: string;

  @ApiProperty({
    description: 'Tipo de CRM',
    enum: ['leadcars', 'hubspot', 'salesforce'],
    example: 'leadcars',
  })
  @IsEnum(['leadcars', 'hubspot', 'salesforce'], {
    message: 'crmType debe ser leadcars, hubspot o salesforce',
  })
  crmType: CrmType;

  @ApiPropertyOptional({
    description: 'Activar/desactivar la integración',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Sincronizar conversaciones de chat con el CRM',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  syncChatConversations?: boolean;

  @ApiPropertyOptional({
    description: 'Eventos que disparan la sincronización',
    example: ['lifecycle_to_lead', 'chat_closed'],
    default: ['lifecycle_to_lead'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  triggerEvents?: string[];

  @ApiProperty({
    description: 'Configuración específica del CRM',
    type: LeadcarsConfigDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => LeadcarsConfigDto)
  config: LeadcarsConfigDto;
}

/**
 * DTO para actualizar configuración de CRM
 */
export class UpdateCrmConfigDto {
  @ApiPropertyOptional({
    description: 'Activar/desactivar la integración',
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Sincronizar conversaciones de chat con el CRM',
  })
  @IsOptional()
  @IsBoolean()
  syncChatConversations?: boolean;

  @ApiPropertyOptional({
    description: 'Eventos que disparan la sincronización',
    example: ['lifecycle_to_lead', 'chat_closed'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  triggerEvents?: string[];

  @ApiPropertyOptional({
    description: 'Configuración específica del CRM',
    type: LeadcarsConfigDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LeadcarsConfigDto)
  config?: LeadcarsConfigDto;
}

/**
 * DTO de respuesta para configuración de CRM
 */
export class CrmConfigResponseDto {
  @ApiProperty({ description: 'ID de la configuración' })
  id: string;

  @ApiProperty({ description: 'ID de la empresa' })
  companyId: string;

  @ApiProperty({
    description: 'Tipo de CRM',
    enum: ['leadcars', 'hubspot', 'salesforce'],
  })
  crmType: CrmType;

  @ApiProperty({ description: 'Estado de la integración' })
  enabled: boolean;

  @ApiProperty({ description: 'Sincronizar conversaciones de chat' })
  syncChatConversations: boolean;

  @ApiProperty({
    description: 'Eventos que disparan la sincronización',
    type: [String],
  })
  triggerEvents: string[];

  @ApiProperty({
    description: 'Configuración específica del CRM (sin datos sensibles)',
  })
  config: Record<string, unknown>;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: string;

  @ApiProperty({ description: 'Fecha de última actualización' })
  updatedAt: string;

  static fromPrimitives(data: {
    id: string;
    companyId: string;
    crmType: CrmType;
    enabled: boolean;
    syncChatConversations: boolean;
    triggerEvents: string[];
    config: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }): CrmConfigResponseDto {
    const dto = new CrmConfigResponseDto();
    dto.id = data.id;
    dto.companyId = data.companyId;
    dto.crmType = data.crmType;
    dto.enabled = data.enabled;
    dto.syncChatConversations = data.syncChatConversations;
    dto.triggerEvents = data.triggerEvents;
    // Ocultar token sensible
    dto.config = {
      ...data.config,
      clienteToken: data.config.clienteToken ? '***OCULTO***' : undefined,
    };
    dto.createdAt = data.createdAt.toISOString();
    dto.updatedAt = data.updatedAt.toISOString();
    return dto;
  }
}

/**
 * DTO para probar conexión con CRM
 */
export class TestCrmConnectionDto {
  @ApiProperty({
    description: 'Tipo de CRM a probar',
    enum: ['leadcars', 'hubspot', 'salesforce'],
  })
  @IsEnum(['leadcars', 'hubspot', 'salesforce'])
  crmType: CrmType;

  @ApiProperty({
    description: 'Configuración a probar',
    type: LeadcarsConfigDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => LeadcarsConfigDto)
  config: LeadcarsConfigDto;
}

/**
 * DTO de respuesta para test de conexión
 */
export class TestConnectionResponseDto {
  @ApiProperty({ description: 'Resultado del test' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Mensaje de error si falló' })
  error?: string;

  @ApiPropertyOptional({
    description: 'Errores de validación de configuración',
  })
  validationErrors?: string[];
}

/**
 * DTO de respuesta para registro de sincronización
 */
export class CrmSyncRecordResponseDto {
  @ApiProperty({ description: 'ID del registro' })
  id: string;

  @ApiProperty({ description: 'ID del visitante' })
  visitorId: string;

  @ApiProperty({ description: 'ID de la empresa' })
  companyId: string;

  @ApiProperty({ description: 'Tipo de CRM' })
  crmType: string;

  @ApiPropertyOptional({ description: 'ID del lead en el CRM externo' })
  externalLeadId?: string;

  @ApiProperty({
    description: 'Estado de sincronización',
    enum: ['pending', 'synced', 'failed', 'partial'],
  })
  status: string;

  @ApiPropertyOptional({ description: 'Última sincronización' })
  lastSyncAt?: string;

  @ApiPropertyOptional({ description: 'Último error' })
  lastError?: string;

  @ApiProperty({ description: 'Número de reintentos' })
  retryCount: number;

  @ApiProperty({ description: 'IDs de chats sincronizados', type: [String] })
  chatsSynced: string[];

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: string;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt: string;

  static fromPrimitives(data: {
    id: string;
    visitorId: string;
    companyId: string;
    crmType: string;
    externalLeadId?: string;
    status: string;
    lastSyncAt?: Date;
    lastError?: string;
    retryCount: number;
    chatsSynced: string[];
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }): CrmSyncRecordResponseDto {
    const dto = new CrmSyncRecordResponseDto();
    dto.id = data.id;
    dto.visitorId = data.visitorId;
    dto.companyId = data.companyId;
    dto.crmType = data.crmType;
    dto.externalLeadId = data.externalLeadId;
    dto.status = data.status;
    dto.lastSyncAt = data.lastSyncAt?.toISOString();
    dto.lastError = data.lastError;
    dto.retryCount = data.retryCount;
    dto.chatsSynced = data.chatsSynced;
    dto.createdAt = data.createdAt.toISOString();
    dto.updatedAt = data.updatedAt.toISOString();
    return dto;
  }
}
