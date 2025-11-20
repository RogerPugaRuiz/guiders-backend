import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de respuesta para un evento de tracking
 */
export class TrackingEventResponseDto {
  @ApiProperty({
    description: 'ID único del evento',
    example: 'e5f6a7b8-c9d0-4e5f-1a2b-3c4d5e6f7a8b',
  })
  id: string;

  @ApiProperty({
    description: 'ID del visitante',
    example: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  })
  visitorId: string;

  @ApiProperty({
    description: 'ID de la sesión',
    example: 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
  })
  sessionId: string;

  @ApiProperty({
    description: 'ID del tenant',
    example: 'c3d4e5f6-a7b8-4c5d-9e0f-1a2b3c4d5e6f',
  })
  tenantId: string;

  @ApiProperty({
    description: 'ID del sitio',
    example: 'd4e5f6a7-b8c9-4d5e-0f1a-2b3c4d5e6f7a',
  })
  siteId: string;

  @ApiProperty({
    description: 'Tipo de evento',
    example: 'PAGE_VIEW',
  })
  eventType: string;

  @ApiProperty({
    description: 'Metadatos del evento',
    example: { url: '/products/laptop', duration: 45 },
  })
  metadata: Record<string, any>;

  @ApiProperty({
    description: 'Fecha y hora en que ocurrió el evento',
    example: '2024-01-15T10:30:00.000Z',
  })
  occurredAt: string;

  @ApiProperty({
    description:
      'Contador de eventos agregados (1 si no hubo agregación, >1 si se consolidaron eventos)',
    example: 1,
  })
  count: number;
}
