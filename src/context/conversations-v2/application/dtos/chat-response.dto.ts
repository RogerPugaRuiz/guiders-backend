import { ApiProperty } from '@nestjs/swagger';
import { ChatPrimitives } from '../../domain/entities/chat.aggregate';

/**
 * DTO de respuesta para información del visitante
 */
export class VisitorInfoResponseDto {
  @ApiProperty({
    description: 'ID único del visitante',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del visitante',
    example: 'Juan Pérez',
  })
  name: string;

  @ApiProperty({
    description: 'Email del visitante',
    example: 'juan.perez@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Teléfono del visitante',
    example: '+1234567890',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'Ubicación del visitante',
    example: 'Madrid, España',
    required: false,
  })
  location?: string;

  @ApiProperty({
    description: 'Datos adicionales del visitante',
    example: { company: 'Acme Corp', ipAddress: '192.168.1.1' },
    required: false,
  })
  additionalData?: Record<string, any>;
}

/**
 * DTO de respuesta para información del comercial asignado
 */
export class AssignedCommercialResponseDto {
  @ApiProperty({
    description: 'ID único del comercial',
    example: '6430f3f5-0095-4057-9fdf-dba045b9a46c',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del comercial',
    example: 'Juan Pérez',
  })
  name: string;
}

/**
 * DTO de respuesta para metadatos del chat
 */
export class ChatMetadataResponseDto {
  @ApiProperty({
    description: 'Departamento responsable del chat',
    example: 'ventas',
  })
  department: string;

  @ApiProperty({
    description: 'Fuente de origen del chat',
    example: 'website',
  })
  source: string;

  @ApiProperty({
    description: 'URL inicial del visitante',
    example: 'https://example.com/productos',
    required: false,
  })
  initialUrl?: string;

  @ApiProperty({
    description: 'User Agent del navegador',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    required: false,
  })
  userAgent?: string;

  @ApiProperty({
    description: 'URL de referencia',
    example: 'https://google.com',
    required: false,
  })
  referrer?: string;

  @ApiProperty({
    description: 'Tags del chat',
    example: { utm_source: 'google', campaign: 'summer2024' },
    required: false,
  })
  tags?: Record<string, any>;

  @ApiProperty({
    description: 'Campos personalizados',
    example: { priority_level: 'high', product_interest: 'premium' },
    required: false,
  })
  customFields?: Record<string, any>;
}

/**
 * DTO de respuesta principal para un chat
 */
export class ChatResponseDto {
  @ApiProperty({
    description: 'ID único del chat',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Estado actual del chat',
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
    enum: ['LOW', 'MEDIUM', 'NORMAL', 'HIGH', 'URGENT'],
    example: 'NORMAL',
  })
  priority: string;

  @ApiProperty({
    description: 'Información del visitante',
    type: VisitorInfoResponseDto,
  })
  visitorInfo: VisitorInfoResponseDto;

  @ApiProperty({
    description:
      'ID del comercial asignado (DEPRECATED: usar assignedCommercial.id)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
    deprecated: true,
  })
  assignedCommercialId?: string;

  @ApiProperty({
    description: 'Información del comercial asignado al chat',
    type: AssignedCommercialResponseDto,
    required: false,
    nullable: true,
  })
  assignedCommercial?: AssignedCommercialResponseDto | null;

  @ApiProperty({
    description: 'IDs de comerciales disponibles para asignación',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
    ],
    required: false,
  })
  availableCommercialIds?: string[];

  @ApiProperty({
    description: 'Metadatos del chat',
    type: ChatMetadataResponseDto,
  })
  metadata: ChatMetadataResponseDto;

  @ApiProperty({
    description: 'Fecha de creación del chat',
    example: '2025-07-28T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de asignación del chat',
    example: '2025-07-28T10:35:00Z',
    required: false,
  })
  assignedAt?: Date;

  @ApiProperty({
    description: 'Fecha de cierre del chat',
    example: '2025-07-28T11:00:00Z',
    required: false,
  })
  closedAt?: Date;

  @ApiProperty({
    description: 'Fecha del último mensaje',
    example: '2025-07-28T10:45:00Z',
    required: false,
  })
  lastMessageDate?: Date;

  @ApiProperty({
    description: 'Número total de mensajes en el chat',
    example: 15,
  })
  totalMessages: number;

  @ApiProperty({
    description: 'Número de mensajes no leídos',
    example: 3,
  })
  unreadMessagesCount: number;

  @ApiProperty({
    description: 'Indica si el chat está activo',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'ID del visitante (campo duplicado para optimización)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  visitorId: string;

  @ApiProperty({
    description: 'Departamento (campo duplicado para optimización)',
    example: 'ventas',
  })
  department: string;

  @ApiProperty({
    description: 'Tags del chat (array para optimización)',
    type: [String],
    example: ['urgent', 'new-customer'],
    required: false,
  })
  tags?: string[];

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2025-07-28T10:45:00Z',
    required: false,
  })
  updatedAt?: Date;

  @ApiProperty({
    description: 'Tiempo promedio de respuesta en minutos',
    example: 5.5,
    required: false,
  })
  averageResponseTimeMinutes?: number;

  @ApiProperty({
    description: 'Duración total del chat en minutos',
    example: 30,
    required: false,
  })
  chatDurationMinutes?: number;

  @ApiProperty({
    description: 'Estado de resolución del chat',
    enum: ['resolved', 'unresolved', 'escalated'],
    example: 'resolved',
    required: false,
  })
  resolutionStatus?: string;

  @ApiProperty({
    description: 'Calificación de satisfacción (1-5)',
    minimum: 1,
    maximum: 5,
    example: 4,
    required: false,
  })
  satisfactionRating?: number;

  // Construye DTO desde entidad dominio (tipos flexibles durante integración)
  static fromDomain(
    chat: {
      toPrimitives: () => ChatPrimitives;
    },
    assignedCommercialData?: { id: string; name: string } | null,
  ): ChatResponseDto {
    const p = chat.toPrimitives();
    const dto = new ChatResponseDto();
    dto.id = p.id;
    dto.status = p.status;
    dto.priority = p.priority;
    dto.visitorId = p.visitorId;
    dto.assignedCommercialId = p.assignedCommercialId;

    // Enriquecer con datos del comercial si están disponibles
    if (p.assignedCommercialId && assignedCommercialData) {
      dto.assignedCommercial = {
        id: assignedCommercialData.id,
        name: assignedCommercialData.name,
      };
    } else {
      dto.assignedCommercial = null;
    }

    dto.availableCommercialIds = [...p.availableCommercialIds];
    dto.createdAt = p.createdAt;
    dto.assignedAt = p.firstResponseTime;
    dto.closedAt = p.closedAt;
    dto.lastMessageDate = p.lastMessageDate;
    dto.totalMessages = p.totalMessages;
    dto.unreadMessagesCount = 0; // TODO: calcular según mensajes no leídos
    dto.isActive = !p.closedAt;
    dto.department = p.metadata?.department || 'general';
    dto.tags = p.metadata?.tags || [];
    dto.updatedAt = p.updatedAt;
    dto.averageResponseTimeMinutes = undefined;
    dto.chatDurationMinutes = undefined;
    // resolutionStatus y satisfactionRating no existen aún en ChatMetadataData, se dejan undefined
    dto.resolutionStatus = undefined;
    dto.satisfactionRating = undefined;
    dto.visitorInfo = {
      id: p.visitorId,
      name: p.visitorInfo.name,
      email: p.visitorInfo.email,
      phone: p.visitorInfo.phone,
      location: p.visitorInfo.location?.city,
      additionalData: {
        company: p.visitorInfo.company,
        ipAddress: p.visitorInfo.ipAddress,
        referrer: p.visitorInfo.referrer,
      },
    } as VisitorInfoResponseDto;
    dto.metadata = {
      department: dto.department,
      source: p.metadata?.source || 'website',
      initialUrl: undefined, // no definido en ChatMetadataData
      userAgent: p.visitorInfo.userAgent,
      referrer: p.visitorInfo.referrer,
      tags: undefined, // usamos dto.tags arriba para consistencia
      customFields: p.metadata?.customFields,
    } as ChatMetadataResponseDto;
    return dto;
  }
}

/**
 * DTO de respuesta para lista paginada de chats con cursor
 */
export class ChatListResponseDto {
  @ApiProperty({
    description: 'Lista de chats',
    type: [ChatResponseDto],
  })
  chats: ChatResponseDto[];

  @ApiProperty({
    description: 'Número total de chats que cumplen los criterios',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Indica si hay más chats disponibles',
    example: true,
  })
  hasMore: boolean;

  @ApiProperty({
    description: 'Cursor para obtener la siguiente página',
    example:
      'eyJsYXN0TWVzc2FnZUF0IjoiMjAyNS0wNy0yOFQxMDozMDowMC4wMDBaIiwiaWQiOiJjaGF0LTEyMyJ9',
    required: false,
  })
  nextCursor?: string | null;
}
