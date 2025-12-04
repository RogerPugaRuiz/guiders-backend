/**
 * DTOs para respuestas de IA
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

/**
 * DTO de respuesta de mensaje de IA
 */
export class AIResponseDto {
  @ApiProperty({
    description: 'ID del mensaje generado',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  messageId: string;

  @ApiProperty({
    description: 'Contenido de la respuesta',
    example: '¡Hola! Gracias por contactarnos. ¿En qué puedo ayudarte?',
  })
  content: string;

  @ApiProperty({
    description: 'Tiempo de procesamiento en milisegundos',
    example: 350,
  })
  processingTimeMs: number;

  @ApiProperty({
    description: 'Modelo utilizado',
    example: 'llama-3.3-70b-versatile',
  })
  model: string;

  @ApiPropertyOptional({
    description: 'Tokens utilizados',
    example: 125,
  })
  tokensUsed?: number;
}

/**
 * DTO para sugerencias de respuesta
 */
export class SuggestionResponseDto {
  @ApiProperty({
    description: 'Lista de sugerencias de respuesta',
    example: [
      'Gracias por tu consulta. Estaré encantado de ayudarte.',
      '¡Claro! Te explico los pasos a seguir.',
      'Entiendo perfectamente. Vamos a ver las opciones.',
    ],
    type: [String],
  })
  suggestions: string[];

  @ApiProperty({
    description: 'Tiempo de procesamiento en milisegundos',
    example: 450,
  })
  processingTimeMs: number;
}

/**
 * DTO para solicitar sugerencias via WebSocket
 */
export class RequestSuggestionsDto {
  @ApiProperty({
    description: 'ID del chat',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  chatId: string;

  @ApiPropertyOptional({
    description: 'Contenido del último mensaje del visitante',
  })
  @IsString()
  @IsOptional()
  lastMessageContent?: string;
}
