import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsNotEmpty,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para información del primer mensaje al crear un chat
 */
export class FirstMessageDto {
  @ApiProperty({
    description: 'Contenido del primer mensaje',
    example: 'Hola, me gustaría información sobre sus productos',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Tipo de mensaje',
    enum: ['text', 'image', 'file'],
    example: 'text',
    required: false,
  })
  @IsOptional()
  @IsEnum(['text', 'image', 'file'])
  type?: string;

  @ApiProperty({
    description: 'Datos del archivo adjunto (solo para tipo file o image)',
    required: false,
    example: {
      url: 'https://example.com/file.pdf',
      fileName: 'documento.pdf',
      fileSize: 2048,
      mimeType: 'application/pdf',
    },
  })
  @IsOptional()
  @IsObject()
  attachment?: {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
}

/**
 * DTO para información del visitante al crear un chat con primer mensaje
 */
export class CreateChatWithMessageVisitorInfoDto {
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
    description: 'Ubicación del visitante',
    example: 'Madrid, España',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Datos adicionales del visitante',
    example: { company: 'Acme Corp', ipAddress: '192.168.1.1' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  additionalData?: Record<string, any>;
}

/**
 * DTO para metadatos del chat al crearlo con primer mensaje
 */
export class CreateChatWithMessageMetadataDto {
  @ApiProperty({
    description: 'Departamento responsable del chat',
    example: 'ventas',
    required: false,
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({
    description: 'Fuente de origen del chat',
    example: 'website',
    required: false,
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({
    description: 'URL inicial del visitante',
    example: 'https://example.com/productos',
    required: false,
  })
  @IsOptional()
  @IsString()
  initialUrl?: string;

  @ApiProperty({
    description: 'User Agent del navegador',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    required: false,
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({
    description: 'Prioridad del chat',
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    example: 'NORMAL',
    required: false,
  })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiProperty({
    description: 'Datos adicionales del chat',
    example: { referrer: 'google.com', campaign: 'summer2025' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  additionalData?: Record<string, any>;
}

/**
 * DTO principal para la request de crear chat con primer mensaje
 */
export class CreateChatWithMessageRequestDto {
  @ApiProperty({
    description: 'Datos del primer mensaje del chat',
    type: FirstMessageDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => FirstMessageDto)
  firstMessage: FirstMessageDto;

  @ApiProperty({
    description:
      'Información del visitante (opcional, se puede inferir del token)',
    type: CreateChatWithMessageVisitorInfoDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateChatWithMessageVisitorInfoDto)
  visitorInfo?: CreateChatWithMessageVisitorInfoDto;

  @ApiProperty({
    description: 'Metadatos del chat (opcional)',
    type: CreateChatWithMessageMetadataDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateChatWithMessageMetadataDto)
  metadata?: CreateChatWithMessageMetadataDto;
}
