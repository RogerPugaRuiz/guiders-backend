import { ApiProperty } from '@nestjs/swagger';

export class TopPageDto {
  @ApiProperty({ description: 'URL de la página' })
  url: string;

  @ApiProperty({ description: 'Título de la página', required: false })
  title?: string;

  @ApiProperty({ description: 'Número de visitas' })
  views: number;
}

export class TopSourceDto {
  @ApiProperty({ description: 'Fuente del visitante' })
  source: string;

  @ApiProperty({ description: 'Número de visitantes' })
  visitors: number;
}

export class VisitorStatsResponseDto {
  @ApiProperty({ description: 'Total de visitantes' })
  totalVisitors: number;

  @ApiProperty({ description: 'Visitantes en línea actualmente' })
  onlineVisitors: number;

  @ApiProperty({ description: 'Visitantes nuevos' })
  newVisitors: number;

  @ApiProperty({ description: 'Visitantes que regresan' })
  returningVisitors: number;

  @ApiProperty({ description: 'Visitantes con chats pendientes' })
  withPendingChats: number;

  @ApiProperty({ description: 'Duración promedio de sesión en segundos' })
  averageSessionDuration: number;

  @ApiProperty({ description: 'Tasa de rebote (0-100)' })
  bounceRate: number;

  @ApiProperty({ description: 'Tasa de conversión (0-100)' })
  conversionRate: number;

  @ApiProperty({ description: 'Páginas más visitadas', type: [TopPageDto] })
  topPages: TopPageDto[];

  @ApiProperty({
    description: 'Principales fuentes de tráfico',
    type: [TopSourceDto],
  })
  topSources: TopSourceDto[];
}
