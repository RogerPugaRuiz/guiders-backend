import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

/**
 * DTO para solicitud de atención de agente
 * Utilizado en el endpoint POST /v2/chats/:chatId/request-agent
 */
export class RequestAgentDto {
  @ApiProperty({
    description: 'ID del visitante que solicita atención',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  visitorId: string;

  @ApiProperty({
    description: 'Timestamp de la solicitud (ISO 8601)',
    example: '2025-12-01T10:30:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiProperty({
    description: 'Origen de la solicitud',
    example: 'quick_action',
    default: 'quick_action',
    required: false,
  })
  @IsOptional()
  @IsString()
  source?: string;
}
