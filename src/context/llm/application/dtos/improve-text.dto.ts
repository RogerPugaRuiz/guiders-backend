/**
 * DTOs para mejora de texto con IA
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

/**
 * DTO para solicitar mejora de texto
 */
export class ImproveTextDto {
  @ApiProperty({
    description: 'Texto a mejorar',
    example: 'hola q tal como estas?',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({
    description: 'ID del sitio (opcional si está disponible en el JWT)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  @IsOptional()
  siteId?: string;
}

/**
 * DTO de respuesta con texto mejorado
 */
export class ImproveTextResponseDto {
  @ApiProperty({
    description: 'Texto mejorado',
    example: '¡Hola! ¿Cómo estás? Espero que te encuentres bien.',
  })
  improvedText: string;

  @ApiProperty({
    description: 'Tiempo de procesamiento en milisegundos',
    example: 320,
  })
  processingTimeMs: number;
}
