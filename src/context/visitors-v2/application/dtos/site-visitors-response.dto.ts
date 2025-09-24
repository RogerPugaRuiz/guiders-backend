import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para información básica de visitante en respuesta de sitio
 */
export class SiteVisitorInfoDto {
  @ApiProperty({
    description: 'ID único del visitante',
    example: 'visitor-uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Fingerprint único del visitante',
    example: 'fp_1234567890abcdef',
  })
  fingerprint: string;

  @ApiProperty({
    description: 'Estado de conexión del visitante',
    enum: ['ONLINE', 'OFFLINE', 'CHATTING'],
    example: 'ONLINE',
  })
  connectionStatus: string;

  @ApiProperty({
    description: 'URL actual del visitante',
    example: 'https://example.com/products',
    nullable: true,
  })
  currentUrl?: string;

  @ApiProperty({
    description: 'User agent del navegador',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    nullable: true,
  })
  userAgent?: string;

  @ApiProperty({
    description: 'Fecha de creación del visitante',
    example: '2025-09-24T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actividad',
    example: '2025-09-24T10:35:00.000Z',
    nullable: true,
  })
  lastActivity?: Date;
}

/**
 * DTO para visitante con información de chat
 */
export class SiteVisitorWithChatDto extends SiteVisitorInfoDto {
  @ApiProperty({
    description: 'ID del chat asociado',
    example: 'chat-uuid-456',
    nullable: true,
  })
  chatId?: string;

  @ApiProperty({
    description: 'Estado del chat',
    enum: [
      'PENDING',
      'ASSIGNED',
      'ACTIVE',
      'CLOSED',
      'TRANSFERRED',
      'ABANDONED',
    ],
    example: 'PENDING',
    nullable: true,
  })
  chatStatus?: string;

  @ApiProperty({
    description: 'Prioridad del chat',
    enum: ['LOW', 'MEDIUM', 'NORMAL', 'HIGH', 'URGENT'],
    example: 'NORMAL',
    nullable: true,
  })
  chatPriority?: string;

  @ApiProperty({
    description: 'Fecha de creación del chat',
    example: '2025-09-24T10:32:00.000Z',
    nullable: true,
  })
  chatCreatedAt?: Date;

  @ApiProperty({
    description: 'ID del comercial asignado al chat',
    example: 'commercial-uuid-789',
    nullable: true,
  })
  assignedCommercialId?: string;

  @ApiProperty({
    description: 'Tiempo de espera en segundos (para chats en cola)',
    example: 180,
    nullable: true,
  })
  waitingTimeSeconds?: number;
}

/**
 * DTO de respuesta para visitantes de un sitio
 */
export class SiteVisitorsResponseDto {
  @ApiProperty({
    description: 'ID del sitio',
    example: 'site-uuid-123',
  })
  siteId: string;

  @ApiProperty({
    description: 'Nombre del sitio',
    example: 'Landing Page Principal',
  })
  siteName: string;

  @ApiProperty({
    description: 'Lista de visitantes del sitio',
    type: [SiteVisitorInfoDto],
  })
  visitors: SiteVisitorInfoDto[];

  @ApiProperty({
    description: 'Total de visitantes encontrados',
    example: 25,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Fecha de consulta',
    example: '2025-09-24T10:30:00.000Z',
  })
  timestamp: Date;
}

/**
 * DTO de respuesta para visitantes con chats no asignados
 */
export class SiteVisitorsUnassignedChatsResponseDto {
  @ApiProperty({
    description: 'ID del sitio',
    example: 'site-uuid-123',
  })
  siteId: string;

  @ApiProperty({
    description: 'Nombre del sitio',
    example: 'Landing Page Principal',
  })
  siteName: string;

  @ApiProperty({
    description: 'Lista de visitantes con chats no asignados',
    type: [SiteVisitorWithChatDto],
  })
  visitors: SiteVisitorWithChatDto[];

  @ApiProperty({
    description: 'Total de visitantes con chats no asignados',
    example: 8,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Fecha de consulta',
    example: '2025-09-24T10:30:00.000Z',
  })
  timestamp: Date;
}

/**
 * DTO de respuesta para visitantes con chats en cola
 */
export class SiteVisitorsQueuedChatsResponseDto {
  @ApiProperty({
    description: 'ID del sitio',
    example: 'site-uuid-123',
  })
  siteId: string;

  @ApiProperty({
    description: 'Nombre del sitio',
    example: 'Landing Page Principal',
  })
  siteName: string;

  @ApiProperty({
    description: 'Lista de visitantes con chats en cola',
    type: [SiteVisitorWithChatDto],
  })
  visitors: SiteVisitorWithChatDto[];

  @ApiProperty({
    description: 'Total de visitantes con chats en cola',
    example: 12,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Tiempo promedio de espera en segundos',
    example: 145,
  })
  averageWaitingTime: number;

  @ApiProperty({
    description: 'Fecha de consulta',
    example: '2025-09-24T10:30:00.000Z',
  })
  timestamp: Date;
}
