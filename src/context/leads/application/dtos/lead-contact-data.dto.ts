import {
  IsString,
  IsOptional,
  IsUUID,
  IsEmail,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadContactDataPrimitives } from '../../domain/services/crm-sync.service';

/**
 * DTO para crear/actualizar datos de contacto de un lead
 */
export class SaveLeadContactDataDto {
  @ApiProperty({
    description: 'ID del visitante',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  visitorId: string;

  @ApiPropertyOptional({
    description: 'Nombre del contacto',
    example: 'Juan',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Apellidos del contacto',
    example: 'García López',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  apellidos?: string;

  @ApiPropertyOptional({
    description: 'Email del contacto',
    example: 'juan.garcia@ejemplo.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Formato de email inválido' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Teléfono del contacto',
    example: '+34612345678',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @ApiPropertyOptional({
    description: 'DNI/NIE del contacto',
    example: '12345678A',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dni?: string;

  @ApiPropertyOptional({
    description: 'Población del contacto',
    example: 'Madrid',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  poblacion?: string;

  @ApiPropertyOptional({
    description: 'Datos adicionales',
    example: { interesadoEn: 'SUV', presupuesto: '30000-40000' },
  })
  @IsOptional()
  @IsObject()
  additionalData?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'ID del chat de donde se extrajo la información',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  extractedFromChatId?: string;
}

/**
 * DTO de respuesta para datos de contacto
 */
export class LeadContactDataResponseDto {
  @ApiProperty({ description: 'ID del registro' })
  id: string;

  @ApiProperty({ description: 'ID del visitante' })
  visitorId: string;

  @ApiProperty({ description: 'ID de la empresa' })
  companyId: string;

  @ApiPropertyOptional({ description: 'Nombre del contacto' })
  nombre?: string;

  @ApiPropertyOptional({ description: 'Apellidos del contacto' })
  apellidos?: string;

  @ApiPropertyOptional({ description: 'Email del contacto' })
  email?: string;

  @ApiPropertyOptional({ description: 'Teléfono del contacto' })
  telefono?: string;

  @ApiPropertyOptional({ description: 'DNI del contacto' })
  dni?: string;

  @ApiPropertyOptional({ description: 'Población del contacto' })
  poblacion?: string;

  @ApiPropertyOptional({ description: 'Datos adicionales' })
  additionalData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'ID del chat de extracción' })
  extractedFromChatId?: string;

  @ApiProperty({ description: 'Fecha de extracción' })
  extractedAt: string;

  @ApiProperty({ description: 'Fecha de última actualización' })
  updatedAt: string;

  static fromPrimitives(
    data: LeadContactDataPrimitives,
  ): LeadContactDataResponseDto {
    const dto = new LeadContactDataResponseDto();
    dto.id = data.id;
    dto.visitorId = data.visitorId;
    dto.companyId = data.companyId;
    dto.nombre = data.nombre;
    dto.apellidos = data.apellidos;
    dto.email = data.email;
    dto.telefono = data.telefono;
    dto.dni = data.dni;
    dto.poblacion = data.poblacion;
    dto.additionalData = data.additionalData;
    dto.extractedFromChatId = data.extractedFromChatId;
    dto.extractedAt =
      data.extractedAt?.toISOString() || new Date().toISOString();
    dto.updatedAt = data.updatedAt?.toISOString() || new Date().toISOString();
    return dto;
  }
}
