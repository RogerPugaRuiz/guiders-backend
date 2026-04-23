import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para enviar un mensaje via Integration API
 */
export class SendIntegrationMessageDto {
  @ApiProperty({ description: 'Contenido del mensaje' })
  @IsString()
  @MaxLength(10000)
  content: string;

  @ApiPropertyOptional({
    description: 'Tipo de contenido',
    enum: ['text', 'html', 'markdown'],
    default: 'text',
  })
  @IsOptional()
  @IsIn(['text', 'html', 'markdown'])
  contentType?: 'text' | 'html' | 'markdown';

  @ApiPropertyOptional({
    description: 'Tipo de remitente',
    enum: ['bot', 'system', 'agent'],
    default: 'bot',
  })
  @IsOptional()
  @IsIn(['bot', 'system', 'agent'])
  senderType?: 'bot' | 'system' | 'agent';

  @ApiPropertyOptional({
    description:
      'ID externo para idempotencia. Si ya existe un mensaje con este ID para el mismo companyId, se devuelve el original.',
  })
  @IsOptional()
  @IsString()
  externalMessageId?: string;
}
