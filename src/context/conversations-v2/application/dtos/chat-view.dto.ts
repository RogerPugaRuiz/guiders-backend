import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

/**
 * DTO para la solicitud de apertura/cierre de vista del chat
 */
export class ChatViewRequestDto {
  @ApiPropertyOptional({
    description: 'Timestamp de la acción (ISO 8601)',
    example: '2024-11-15T10:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}

/**
 * DTO para la respuesta de apertura/cierre de vista del chat
 */
export class ChatViewResponseDto {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'ID del chat',
    example: '6e789c01-4567-abc8-def0-123456789abc',
  })
  chatId: string;

  @ApiProperty({
    description: 'ID del visitante',
    example: 'abc12345',
  })
  visitorId: string;

  @ApiProperty({
    description: 'Fecha de la última actividad',
    example: '2024-11-15T10:30:00Z',
  })
  lastActivity: string;

  @ApiProperty({
    description: 'Estado actual del chat',
    example: 'ACTIVE',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'ID del comercial asignado (si aplica)',
    example: 'commercial-789',
  })
  assignedCommercialId?: string;

  @ApiProperty({
    description: 'Prioridad del chat',
    example: 'NORMAL',
  })
  priority: string;

  @ApiProperty({
    description: 'Número total de mensajes',
    example: 5,
  })
  totalMessages: number;

  @ApiProperty({
    description: 'Fecha de creación del chat',
    example: '2024-11-15T09:00:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2024-11-15T10:30:00Z',
  })
  updatedAt: string;
}
