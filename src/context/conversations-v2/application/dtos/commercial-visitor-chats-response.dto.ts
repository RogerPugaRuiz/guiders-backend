import { ApiProperty } from '@nestjs/swagger';

/**
 * Resumen de un chat en el contexto de un comercial buscando chats de un visitante.
 */
export class CommercialVisitorChatSummaryDto {
  @ApiProperty({ example: 'chat-123' })
  id!: string;

  @ApiProperty({ example: 'visitor-456' })
  visitorId!: string;

  @ApiProperty({ example: 'commercial-789', nullable: true, required: false })
  assignedCommercialId?: string | null;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: 'HIGH' })
  priority!: string;

  @ApiProperty({ format: 'date-time', example: '2025-07-28T10:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({
    format: 'date-time',
    example: '2025-07-28T11:15:00.000Z',
    nullable: true,
    required: false,
  })
  lastMessageDate?: string | null;
}

/**
 * Respuesta del endpoint GET /v2/chats/my-visitor-chat/:visitorId.
 * Devuelve los chats del visitante asignados al comercial autenticado, con totales y paginación.
 */
export class CommercialVisitorChatsResponseDto {
  @ApiProperty({
    type: [CommercialVisitorChatSummaryDto],
    description:
      'Lista de chats del visitante asignados al comercial autenticado',
  })
  chats!: CommercialVisitorChatSummaryDto[];

  @ApiProperty({
    description:
      'Número total de chats asignados al comercial para este visitante',
    example: 1,
  })
  total!: number;

  @ApiProperty({
    description:
      'Número total de chats del visitante sin filtrar por comercial asignado',
    example: 3,
  })
  totalVisitorChats!: number;

  @ApiProperty({
    description: 'Indica si hay más chats disponibles',
    example: false,
  })
  hasMore!: boolean;
}
