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

/**
 * DTO para un modelo LLM disponible
 */
export class LlmModelDto {
  @ApiProperty({
    description: 'ID del modelo',
    example: 'llama-3.3-70b-versatile',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre descriptivo del modelo',
    example: 'Llama 3.3 70B Versatile',
  })
  name: string;

  @ApiProperty({
    description: 'Proveedor del modelo',
    example: 'groq',
  })
  provider: string;

  @ApiProperty({
    description: 'Descripción del modelo',
    example: 'Modelo versátil de Meta con 70B parámetros, ideal para conversaciones',
  })
  description: string;

  @ApiProperty({
    description: 'Máximo de tokens de contexto',
    example: 128000,
  })
  maxContextTokens: number;

  @ApiProperty({
    description: 'Indica si el modelo está activo y disponible',
    example: true,
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Indica si es el modelo recomendado por defecto',
    example: true,
  })
  isDefault?: boolean;
}

/**
 * DTO para un proveedor LLM
 */
export class LlmProviderDto {
  @ApiProperty({
    description: 'ID del proveedor',
    example: 'groq',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del proveedor',
    example: 'Groq',
  })
  name: string;

  @ApiProperty({
    description: 'Indica si el proveedor está activo',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Modelos disponibles del proveedor',
    type: [LlmModelDto],
  })
  models: LlmModelDto[];
}

/**
 * DTO de respuesta con lista de modelos disponibles
 */
export class LlmModelsListResponseDto {
  @ApiProperty({
    description: 'Lista de proveedores con sus modelos',
    type: [LlmProviderDto],
  })
  providers: LlmProviderDto[];

  @ApiProperty({
    description: 'Modelo por defecto recomendado',
    example: 'llama-3.3-70b-versatile',
  })
  defaultModel: string;

  @ApiProperty({
    description: 'Proveedor por defecto recomendado',
    example: 'groq',
  })
  defaultProvider: string;
}
