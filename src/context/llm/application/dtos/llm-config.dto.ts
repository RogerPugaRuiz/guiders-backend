/**
 * DTOs para configuración de LLM
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO de respuesta de configuración LLM
 */
export class LlmConfigResponseDto {
  @ApiProperty({
    description: 'ID del sitio',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  siteId: string;

  @ApiProperty({
    description: 'ID de la compañía',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  companyId: string;

  @ApiProperty({
    description: 'Habilitar respuestas automáticas de IA',
    example: true,
  })
  aiAutoResponseEnabled: boolean;

  @ApiProperty({
    description: 'Habilitar sugerencias de IA para comerciales',
    example: true,
  })
  aiSuggestionsEnabled: boolean;

  @ApiProperty({
    description: 'IA responde aunque haya comercial asignado',
    example: false,
  })
  aiRespondWithCommercial: boolean;

  @ApiProperty({
    description: 'Proveedor de LLM preferido',
    example: 'groq',
  })
  preferredProvider: string;

  @ApiProperty({
    description: 'Modelo de LLM preferido',
    example: 'llama-3.3-70b-versatile',
  })
  preferredModel: string;

  @ApiPropertyOptional({
    description: 'Prompt del sistema personalizado',
    example: 'Eres un asistente de ventas especializado en tecnología.',
  })
  customSystemPrompt?: string;

  @ApiProperty({
    description: 'Máximo de tokens en la respuesta',
    example: 500,
  })
  maxResponseTokens: number;

  @ApiProperty({
    description: 'Temperatura del modelo (0-1)',
    example: 0.7,
  })
  temperature: number;

  @ApiProperty({
    description: 'Delay antes de enviar respuesta (ms)',
    example: 1000,
  })
  responseDelayMs: number;

  @ApiPropertyOptional({
    description: 'Fecha de creación',
  })
  createdAt?: Date;

  @ApiPropertyOptional({
    description: 'Fecha de última actualización',
  })
  updatedAt?: Date;
}

/**
 * DTO para actualizar configuración LLM
 */
export class UpdateLlmConfigDto {
  @ApiPropertyOptional({
    description: 'Habilitar respuestas automáticas de IA',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  aiAutoResponseEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Habilitar sugerencias de IA para comerciales',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  aiSuggestionsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'IA responde aunque haya comercial asignado',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  aiRespondWithCommercial?: boolean;

  @ApiPropertyOptional({
    description: 'Proveedor de LLM preferido',
    example: 'groq',
  })
  @IsString()
  @IsOptional()
  preferredProvider?: string;

  @ApiPropertyOptional({
    description: 'Modelo de LLM preferido',
    example: 'llama-3.3-70b-versatile',
  })
  @IsString()
  @IsOptional()
  preferredModel?: string;

  @ApiPropertyOptional({
    description: 'Prompt del sistema personalizado',
    example: 'Eres un asistente de ventas especializado en tecnología.',
  })
  @IsString()
  @IsOptional()
  customSystemPrompt?: string;

  @ApiPropertyOptional({
    description: 'Máximo de tokens en la respuesta',
    example: 500,
    minimum: 50,
    maximum: 2000,
  })
  @IsNumber()
  @IsOptional()
  @Min(50)
  @Max(2000)
  maxResponseTokens?: number;

  @ApiPropertyOptional({
    description: 'Temperatura del modelo (0-1)',
    example: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Delay antes de enviar respuesta (ms)',
    example: 1000,
    minimum: 0,
    maximum: 5000,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5000)
  responseDelayMs?: number;
}

/**
 * DTO para crear configuración LLM
 */
export class CreateLlmConfigDto extends UpdateLlmConfigDto {
  @ApiProperty({
    description: 'ID del sitio',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  siteId: string;

  @ApiProperty({
    description: 'ID de la compañía',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  companyId: string;
}
