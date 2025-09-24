import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

/**
 * DTO para conectar un comercial
 */
export class ConnectCommercialDto {
  @ApiProperty({
    description: 'ID del comercial',
    example: 'e7f8a9b0-1234-5678-9abc-def012345678',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Nombre del comercial',
    example: 'Juan Pérez',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Metadatos adicionales',
    example: { browser: 'Chrome', version: '120.0' },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO para enviar heartbeat de actividad
 */
export class CommercialHeartbeatDto {
  @ApiProperty({
    description: 'ID del comercial',
    example: 'e7f8a9b0-1234-5678-9abc-def012345678',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Timestamp de la última actividad',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  lastActivity?: string;

  @ApiProperty({
    description: 'Metadatos adicionales de la actividad',
    example: { action: 'message_sent', chatId: 'chat-123' },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO para desconectar un comercial
 */
export class DisconnectCommercialDto {
  @ApiProperty({
    description: 'ID del comercial',
    example: 'e7f8a9b0-1234-5678-9abc-def012345678',
  })
  @IsString()
  @IsNotEmpty()
  id: string;
}
