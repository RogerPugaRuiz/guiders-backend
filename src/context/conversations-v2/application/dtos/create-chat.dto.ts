import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsArray, 
  IsObject, 
  IsUUID,
  ValidateNested 
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para la información del visitante en la creación de chat
 */
export class CreateChatVisitorInfoDto {
  @ApiProperty({
    description: 'Nombre del visitante',
    example: 'Juan Pérez',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Email del visitante',
    example: 'juan.perez@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Teléfono del visitante',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Empresa del visitante',
    example: 'Acme Corp',
    required: false,
  })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({
    description: 'Dirección IP del visitante',
    example: '192.168.1.1',
    required: false,
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({
    description: 'Ubicación del visitante',
    example: { country: 'España', city: 'Madrid' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  location?: {
    country?: string;
    city?: string;
  };

  @ApiProperty({
    description: 'URL de referencia',
    example: 'https://example.com/productos',
    required: false,
  })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiProperty({
    description: 'User agent del navegador',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    required: false,
  })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

/**
 * DTO para metadatos del chat en la creación
 */
export class CreateChatMetadataDto {
  @ApiProperty({
    description: 'Departamento al que se asigna el chat',
    example: 'ventas',
    required: false,
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({
    description: 'Producto de interés',
    example: 'Plan Premium',
    required: false,
  })
  @IsOptional()
  @IsString()
  product?: string;

  @ApiProperty({
    description: 'Origen del chat',
    example: 'web',
    required: false,
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({
    description: 'Tags personalizados',
    example: ['urgente', 'vip'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: 'Campaña de marketing',
    example: 'Black Friday 2024',
    required: false,
  })
  @IsOptional()
  @IsString()
  campaign?: string;

  @ApiProperty({
    description: 'UTM source',
    example: 'google',
    required: false,
  })
  @IsOptional()
  @IsString()
  utmSource?: string;

  @ApiProperty({
    description: 'UTM medium',
    example: 'cpc',
    required: false,
  })
  @IsOptional()
  @IsString()
  utmMedium?: string;

  @ApiProperty({
    description: 'UTM campaign',
    example: 'summer_sale',
    required: false,
  })
  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @ApiProperty({
    description: 'Campos personalizados adicionales',
    example: { leadScore: 85, segment: 'enterprise' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;
}

/**
 * DTO principal para crear un chat V2
 */
export class CreateChatDto {
  @ApiProperty({
    description: 'ID único del visitante que inicia el chat',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsUUID()
  visitorId: string;

  @ApiProperty({
    description: 'Información del visitante',
    type: CreateChatVisitorInfoDto,
  })
  @ValidateNested()
  @Type(() => CreateChatVisitorInfoDto)
  visitorInfo: CreateChatVisitorInfoDto;

  @ApiProperty({
    description: 'IDs de los comerciales disponibles para este chat',
    example: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
  })
  @IsArray()
  @IsString({ each: true })
  availableCommercialIds: string[];

  @ApiProperty({
    description: 'Prioridad del chat',
    example: 'NORMAL',
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    required: false,
  })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiProperty({
    description: 'Metadatos adicionales del chat',
    type: CreateChatMetadataDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateChatMetadataDto)
  metadata?: CreateChatMetadataDto;
}