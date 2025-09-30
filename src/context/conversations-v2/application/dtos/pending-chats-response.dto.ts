import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para información del visitante en respuesta de chats pendientes
 */
export class PendingChatsVisitorInfoDto {
  @ApiProperty({
    description: 'ID único del visitante',
    example: 'visitor-123',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del visitante',
    example: 'Juan Pérez',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Fingerprint del visitante',
    example: 'fp_abc123',
    required: false,
  })
  fingerprint?: string;

  @ApiProperty({
    description: 'Dominio desde el cual el visitante accedió',
    example: 'ejemplo.com',
    required: false,
  })
  domain?: string;
}

/**
 * DTO para el último mensaje de un chat
 */
export class LastMessageDto {
  @ApiProperty({
    description: 'Contenido del último mensaje',
    example: 'Hola, necesito información',
  })
  content: string;

  @ApiProperty({
    description: 'Fecha de envío del mensaje',
    example: '2025-09-30T10:35:00Z',
  })
  sentAt: string;

  @ApiProperty({
    description: 'Tipo de remitente',
    enum: ['VISITOR', 'AGENT', 'SYSTEM'],
    example: 'VISITOR',
  })
  senderType: string;
}

/**
 * DTO para un chat pendiente
 */
export class PendingChatDto {
  @ApiProperty({
    description: 'ID único del chat',
    example: 'chat-456',
  })
  chatId: string;

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
  })
  status: string;

  @ApiProperty({
    description: 'Prioridad del chat',
    enum: ['HIGH', 'MEDIUM', 'LOW', 'URGENT', 'NORMAL'],
    example: 'HIGH',
  })
  priority: string;

  @ApiProperty({
    description: 'Departamento responsable',
    example: 'ventas',
    required: false,
  })
  department?: string;

  @ApiProperty({
    description: 'Asunto del chat',
    example: 'Consulta sobre precios',
    required: false,
  })
  subject?: string;

  @ApiProperty({
    description: 'Posición en la cola de espera',
    example: 1,
    required: false,
  })
  queuePosition?: number;

  @ApiProperty({
    description: 'Tiempo estimado de espera en segundos',
    example: 300,
    required: false,
  })
  estimatedWaitTime?: number;

  @ApiProperty({
    description: 'Fecha de creación del chat',
    example: '2025-09-30T10:30:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Último mensaje del chat',
    type: LastMessageDto,
    required: false,
  })
  lastMessage?: LastMessageDto;

  @ApiProperty({
    description: 'Número de mensajes no leídos',
    example: 3,
    required: false,
  })
  unreadCount?: number;
}

/**
 * DTO para un mensaje en el historial de chat
 */
export class ChatHistoryMessageDto {
  @ApiProperty({
    description: 'ID único del mensaje',
    example: 'msg-789',
  })
  messageId: string;

  @ApiProperty({
    description: 'Contenido del mensaje',
    example: 'Mensaje completo...',
  })
  content: string;

  @ApiProperty({
    description: 'Tipo de remitente',
    enum: ['VISITOR', 'AGENT', 'SYSTEM'],
    example: 'VISITOR',
  })
  senderType: string;

  @ApiProperty({
    description: 'Fecha de envío del mensaje',
    example: '2025-09-30T10:35:00Z',
  })
  sentAt: string;
}

/**
 * DTO para una actividad del visitante
 */
export class VisitorActivityDto {
  @ApiProperty({
    description: 'ID único de la actividad',
    example: 'act-001',
  })
  activityId: string;

  @ApiProperty({
    description: 'Tipo de actividad',
    enum: ['page_view', 'form_submission', 'button_click'],
    example: 'page_view',
  })
  type: string;

  @ApiProperty({
    description: 'Descripción de la actividad',
    example: 'Visitó página de precios',
  })
  description: string;

  @ApiProperty({
    description: 'Fecha y hora de la actividad',
    example: '2025-09-30T10:25:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Metadatos adicionales de la actividad',
    example: { page: '/pricing', duration: 120 },
    required: false,
  })
  metadata?: Record<string, any>;
}

/**
 * DTO de respuesta para el endpoint de chats pendientes
 */
export class PendingChatsResponseDto {
  @ApiProperty({
    description: 'Información del visitante',
    type: PendingChatsVisitorInfoDto,
    required: false,
  })
  visitor?: PendingChatsVisitorInfoDto;

  @ApiProperty({
    description: 'Lista de chats pendientes',
    type: [PendingChatDto],
  })
  pendingChats: PendingChatDto[];

  @ApiProperty({
    description: 'Historial de mensajes por chat',
    example: {
      'chat-456': [
        {
          messageId: 'msg-789',
          content: 'Mensaje completo...',
          senderType: 'VISITOR',
          sentAt: '2025-09-30T10:35:00Z',
        },
      ],
    },
    required: false,
  })
  chatHistory?: Record<string, ChatHistoryMessageDto[]>;

  @ApiProperty({
    description: 'Actividades del visitante',
    type: [VisitorActivityDto],
    required: false,
  })
  visitorActivity?: VisitorActivityDto[];
}
