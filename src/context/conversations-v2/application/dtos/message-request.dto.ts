import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsObject,
  IsEnum,
  IsDateString,
  IsArray,
} from 'class-validator';

/**
 * DTO para enviar un nuevo mensaje
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'ID del chat donde se enviará el mensaje',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  chatId: string;

  @ApiProperty({
    description: 'Contenido del mensaje',
    example: 'Hola, ¿en qué puedo ayudarte?',
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Tipo de mensaje',
    enum: ['text', 'image', 'file', 'system'],
    example: 'text',
    required: false,
  })
  @IsOptional()
  @IsEnum(['text', 'image', 'file', 'system'])
  type?: string;

  @ApiProperty({
    description: 'Indica si es un mensaje interno (solo para comerciales)',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiProperty({
    description: 'Datos del archivo adjunto',
    required: false,
    example: {
      url: 'https://example.com/file.pdf',
      fileName: 'documento.pdf',
      fileSize: 2048,
      mimeType: 'application/pdf',
    },
  })
  @IsOptional()
  @IsObject()
  attachment?: {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
}

/**
 * DTO para filtros de búsqueda de mensajes
 */
export class MessageFiltersDto {
  @ApiProperty({
    description: 'Tipos de mensaje a incluir',
    example: ['text', 'image'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[];

  @ApiProperty({
    description: 'Fecha de inicio del rango',
    example: '2025-07-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    description: 'Fecha de fin del rango',
    example: '2025-07-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({
    description: 'ID del remitente del mensaje',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  @IsOptional()
  @IsString()
  senderId?: string;

  @ApiProperty({
    description: 'Tipo de remitente',
    enum: ['visitor', 'commercial', 'system'],
    example: 'commercial',
    required: false,
  })
  @IsOptional()
  @IsEnum(['visitor', 'commercial', 'system'])
  senderType?: 'visitor' | 'commercial' | 'system';

  @ApiProperty({
    description: 'Filtrar por mensajes leídos/no leídos',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiProperty({
    description: 'Filtrar por mensajes con archivos adjuntos',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  hasAttachments?: boolean;

  @ApiProperty({
    description: 'Palabra clave para búsqueda en el contenido',
    example: 'problema técnico',
    required: false,
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}

/**
 * DTO para opciones de ordenamiento de mensajes
 */
export class MessageSortDto {
  @ApiProperty({
    description: 'Campo por el cual ordenar',
    enum: ['sentAt', 'readAt', 'type'],
    example: 'sentAt',
  })
  @IsEnum(['sentAt', 'readAt', 'type'])
  field: 'sentAt' | 'readAt' | 'type';

  @ApiProperty({
    description: 'Dirección del ordenamiento',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @IsEnum(['ASC', 'DESC'])
  direction: 'ASC' | 'DESC';
}

/**
 * DTO para obtener mensajes con filtros y paginación
 */
export class GetMessagesDto {
  @ApiProperty({
    description: 'Filtros de búsqueda',
    required: false,
  })
  @IsOptional()
  @IsObject()
  filters?: MessageFiltersDto;

  @ApiProperty({
    description: 'Opciones de ordenamiento',
    required: false,
  })
  @IsOptional()
  @IsObject()
  sort?: MessageSortDto;

  @ApiProperty({
    description: 'Cursor para paginación',
    required: false,
    example:
      'eyJzZW50QXQiOiIyMDI1LTA3LTI4VDEwOjMwOjAwLjAwMFoiLCJpZCI6Im1zZy0xMjMifQ==',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    description: 'Número máximo de mensajes a retornar (1-100)',
    example: 50,
    required: false,
  })
  @IsOptional()
  limit?: number;
}

/**
 * DTO para marcar mensajes como leídos
 */
export class MarkAsReadDto {
  @ApiProperty({
    description: 'IDs de los mensajes a marcar como leídos',
    example: ['msg-1', 'msg-2', 'msg-3'],
  })
  @IsArray()
  @IsString({ each: true })
  messageIds: string[];
}
