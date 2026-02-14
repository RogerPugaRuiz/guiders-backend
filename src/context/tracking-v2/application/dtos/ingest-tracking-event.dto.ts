import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsISO8601,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para recibir un evento de tracking individual
 */
export class IngestTrackingEventDto {
  @ApiProperty({
    description: 'ID del visitante que genera el evento',
    example: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  })
  @IsString()
  @IsNotEmpty()
  visitorId: string;

  @ApiProperty({
    description: 'ID de la sesión actual del visitante',
    example: 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'Tipo de evento (PAGE_VIEW, CLICK, SCROLL, etc.)',
    example: 'PAGE_VIEW',
  })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiProperty({
    description: 'Metadatos del evento en formato JSON flexible',
    example: {
      url: '/products/laptop',
      title: 'Laptop Pro 2024',
      category: 'Electronics',
      duration: 45,
    },
  })
  @IsObject()
  metadata: Record<string, any>;

  @ApiProperty({
    description:
      'Fecha y hora en que ocurrió el evento (ISO 8601). Si no se proporciona, se usa la hora del servidor.',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  @IsISO8601()
  @IsOptional()
  occurredAt?: string;

  @ApiProperty({
    description:
      'Timestamp en milisegundos de cuándo el evento fue encolado en el cliente antes de enviarse al backend. ' +
      'Se usa para calcular latencia de transmisión y detectar eventos retrasados.',
    example: 1771064528320,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  __queuedAt?: number;

  @ApiProperty({
    description:
      'Número de eventos idénticos que fueron agregados en el cliente antes de enviar. ' +
      'Por defecto es 1. Valores mayores indican que se consolidaron múltiples eventos duplicados.',
    example: 1,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  aggregatedCount?: number;

  @ApiProperty({
    description:
      'Fecha y hora (ISO 8601) del primer evento en caso de agregación. ' +
      'Solo presente cuando aggregatedCount > 1.',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  @IsISO8601()
  @IsOptional()
  firstOccurredAt?: string;

  @ApiProperty({
    description:
      'Fecha y hora (ISO 8601) del último evento en caso de agregación. ' +
      'Solo presente cuando aggregatedCount > 1.',
    example: '2024-01-15T10:30:15.000Z',
    required: false,
  })
  @IsISO8601()
  @IsOptional()
  lastOccurredAt?: string;
}
