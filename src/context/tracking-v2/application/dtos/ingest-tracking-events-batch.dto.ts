import {
  IsArray,
  IsString,
  IsNotEmpty,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IngestTrackingEventDto } from './ingest-tracking-event.dto';

/**
 * DTO para recibir múltiples eventos de tracking en batch
 * Este es el DTO principal para la ingesta masiva de eventos
 */
export class IngestTrackingEventsBatchDto {
  @ApiProperty({
    description: 'ID del tenant (empresa) que envía los eventos',
    example: 'c3d4e5f6-a7b8-4c5d-9e0f-1a2b3c4d5e6f',
  })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({
    description: 'ID del sitio web desde donde se generan los eventos',
    example: 'd4e5f6a7-b8c9-4d5e-0f1a-2b3c4d5e6f7a',
  })
  @IsString()
  @IsNotEmpty()
  siteId: string;

  @ApiProperty({
    description:
      'Array de eventos de tracking (mínimo 1, máximo 500 por batch)',
    type: [IngestTrackingEventDto],
    example: [
      {
        visitorId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        sessionId: 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
        eventType: 'PAGE_VIEW',
        metadata: { url: '/home', title: 'Home Page' },
        occurredAt: '2024-01-15T10:30:00.000Z',
      },
      {
        visitorId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        sessionId: 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
        eventType: 'CLICK',
        metadata: { element: 'button', id: 'cta-signup' },
        occurredAt: '2024-01-15T10:30:15.000Z',
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe enviar al menos 1 evento' })
  @ArrayMaxSize(500, { message: 'Máximo 500 eventos por batch' })
  @ValidateNested({ each: true })
  @Type(() => IngestTrackingEventDto)
  events: IngestTrackingEventDto[];
}
