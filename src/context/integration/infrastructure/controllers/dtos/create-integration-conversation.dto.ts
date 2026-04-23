import { IsString, IsOptional, IsObject, IsUUID, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para crear una conversación via Integration API
 */
export class CreateIntegrationConversationDto {
  @ApiProperty({ description: 'ID UUID del visitante existente en Guiders' })
  @IsUUID()
  visitorId: string;

  @ApiProperty({ description: 'Mensaje inicial de la conversación' })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Canal de la conversación',
    enum: ['chat', 'email', 'whatsapp'],
    default: 'chat',
  })
  @IsOptional()
  @IsIn(['chat', 'email', 'whatsapp'])
  channel?: 'chat' | 'email' | 'whatsapp';

  @ApiPropertyOptional({ description: 'Metadatos adicionales' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
