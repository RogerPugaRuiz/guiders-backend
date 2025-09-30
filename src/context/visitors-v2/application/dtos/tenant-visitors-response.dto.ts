import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para información básica de visitante con información del sitio en respuesta de tenant
 */
export class TenantVisitorInfoDto {
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
    description: 'ID del sitio donde está el visitante',
    example: 'site-uuid-456',
  })
  siteId: string;

  @ApiProperty({
    description: 'Nombre del sitio donde está el visitante',
    example: 'Landing Page Principal',
  })
  siteName: string;

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
 * DTO para visitante con información de chat para respuesta de tenant
 */
export class TenantVisitorWithChatDto extends TenantVisitorInfoDto {
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
 * DTO de respuesta para visitantes de un tenant (empresa)
 */
export class TenantVisitorsResponseDto {
  @ApiProperty({
    description: 'ID del tenant (empresa)',
    example: 'tenant-uuid-123',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Nombre de la empresa',
    example: 'Mi Empresa S.L.',
  })
  companyName: string;

  @ApiProperty({
    description: 'Lista de visitantes del tenant (todos los sitios)',
    type: [TenantVisitorInfoDto],
  })
  visitors: TenantVisitorInfoDto[];

  @ApiProperty({
    description: 'Total de visitantes encontrados',
    example: 25,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Número de sitios con visitantes activos',
    example: 3,
  })
  activeSitesCount: number;

  @ApiProperty({
    description: 'Lista de IDs de chats pendientes en el tenant',
    example: ['chat-uuid-123', 'chat-uuid-456', 'chat-uuid-789'],
    type: [String],
  })
  pendingChatIds: string[];

  @ApiProperty({
    description: 'Fecha de consulta',
    example: '2025-09-24T10:30:00.000Z',
  })
  timestamp: Date;
}

/**
 * DTO de respuesta para visitantes con chats no asignados de un tenant
 */
export class TenantVisitorsUnassignedChatsResponseDto {
  @ApiProperty({
    description: 'ID del tenant (empresa)',
    example: 'tenant-uuid-123',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Nombre de la empresa',
    example: 'Mi Empresa S.L.',
  })
  companyName: string;

  @ApiProperty({
    description: 'Lista de visitantes con chats no asignados',
    type: [TenantVisitorWithChatDto],
  })
  visitors: TenantVisitorWithChatDto[];

  @ApiProperty({
    description: 'Total de visitantes con chats no asignados',
    example: 8,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Número de sitios con chats sin asignar',
    example: 2,
  })
  sitesWithUnassignedChats: number;

  @ApiProperty({
    description: 'Lista de IDs de chats pendientes sin asignar en el tenant',
    example: ['chat-uuid-123', 'chat-uuid-456'],
    type: [String],
  })
  pendingChatIds: string[];

  @ApiProperty({
    description: 'Fecha de consulta',
    example: '2025-09-24T10:30:00.000Z',
  })
  timestamp: Date;
}

/**
 * DTO de respuesta para visitantes con chats en cola de un tenant
 */
export class TenantVisitorsQueuedChatsResponseDto {
  @ApiProperty({
    description: 'ID del tenant (empresa)',
    example: 'tenant-uuid-123',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Nombre de la empresa',
    example: 'Mi Empresa S.L.',
  })
  companyName: string;

  @ApiProperty({
    description: 'Lista de visitantes con chats en cola',
    type: [TenantVisitorWithChatDto],
  })
  visitors: TenantVisitorWithChatDto[];

  @ApiProperty({
    description: 'Total de visitantes con chats en cola',
    example: 12,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Número de sitios con chats en cola',
    example: 3,
  })
  sitesWithQueuedChats: number;

  @ApiProperty({
    description: 'Tiempo promedio de espera en segundos',
    example: 145,
  })
  averageWaitingTime: number;

  @ApiProperty({
    description: 'Lista de IDs de chats pendientes en cola en el tenant',
    example: ['chat-uuid-111', 'chat-uuid-222', 'chat-uuid-333'],
    type: [String],
  })
  pendingChatIds: string[];

  @ApiProperty({
    description: 'Fecha de consulta',
    example: '2025-09-24T10:30:00.000Z',
  })
  timestamp: Date;
}
