import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de respuesta para estadísticas de eventos
 */
export class EventStatsResponseDto {
  @ApiProperty({
    description: 'Total de eventos en el período',
    example: 1543,
  })
  totalEvents: number;

  @ApiProperty({
    description: 'Eventos agrupados por tipo',
    example: {
      PAGE_VIEW: 450,
      CLICK: 320,
      SCROLL: 280,
      FORM_SUBMIT: 12,
    },
  })
  eventsByType: Record<string, number>;

  @ApiProperty({
    description: 'Número de visitantes únicos',
    example: 89,
  })
  uniqueVisitors: number;

  @ApiProperty({
    description: 'Número de sesiones únicas',
    example: 124,
  })
  uniqueSessions: number;

  @ApiProperty({
    description: 'Rango de fechas del reporte',
    example: {
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-01-31T23:59:59.999Z',
    },
  })
  dateRange: {
    from: string;
    to: string;
  };
}

/**
 * DTO de respuesta para estadísticas de eventos por visitante
 */
export class VisitorEventStatsResponseDto {
  @ApiProperty({
    description: 'ID del visitante',
    example: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  })
  visitorId: string;

  @ApiProperty({
    description: 'Total de eventos del visitante',
    example: 87,
  })
  totalEvents: number;

  @ApiProperty({
    description: 'Eventos agrupados por tipo',
    example: {
      PAGE_VIEW: 25,
      CLICK: 18,
      SCROLL: 30,
      FORM_SUBMIT: 1,
    },
  })
  eventsByType: Record<string, number>;

  @ApiProperty({
    description: 'Número de sesiones del visitante',
    example: 3,
  })
  sessionsCount: number;

  @ApiProperty({
    description: 'Fecha del primer evento',
    example: '2024-01-10T14:25:00.000Z',
  })
  firstEventAt: string;

  @ApiProperty({
    description: 'Fecha del último evento',
    example: '2024-01-15T16:42:00.000Z',
  })
  lastEventAt: string;
}

/**
 * DTO de respuesta para el resultado de ingesta de eventos
 */
export class IngestEventsResponseDto {
  @ApiProperty({
    description: 'Indica si la ingesta fue exitosa',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Número de eventos recibidos',
    example: 120,
  })
  received: number;

  @ApiProperty({
    description: 'Número de eventos procesados después de throttling',
    example: 95,
  })
  processed: number;

  @ApiProperty({
    description: 'Número de eventos descartados por throttling',
    example: 25,
  })
  discarded: number;

  @ApiProperty({
    description: 'Número de eventos únicos después de agregación',
    example: 78,
  })
  aggregated: number;

  @ApiProperty({
    description: 'Mensaje descriptivo del resultado',
    example: 'Eventos procesados exitosamente',
  })
  message: string;

  @ApiProperty({
    description: 'Tiempo de procesamiento en milisegundos',
    example: 145,
  })
  processingTimeMs: number;
}
