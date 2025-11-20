import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para la respuesta del estado de conexión de un comercial
 */
export class CommercialConnectionStatusResponseDto {
  @ApiProperty({
    description: 'ID del comercial',
    example: 'e7f8a9b0-1234-5678-9abc-def012345678',
  })
  commercialId: string;

  @ApiProperty({
    description: 'Estado de conexión del comercial',
    example: 'CONNECTED',
    enum: ['CONNECTED', 'DISCONNECTED'],
  })
  connectionStatus: string;

  @ApiProperty({
    description: 'Última actividad registrada',
    example: '2024-01-15T10:30:00.000Z',
  })
  lastActivity: Date;

  @ApiProperty({
    description: 'Indica si el comercial está actualmente activo',
    example: true,
  })
  isActive: boolean;
}

/**
 * DTO para información resumida de un comercial
 */
export class CommercialSummaryDto {
  @ApiProperty({
    description: 'ID del comercial',
    example: 'e7f8a9b0-1234-5678-9abc-def012345678',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del comercial',
    example: 'Juan Pérez',
  })
  name: string;

  @ApiProperty({
    description: 'Estado de conexión del comercial',
    example: 'CONNECTED',
    enum: ['CONNECTED', 'DISCONNECTED'],
  })
  connectionStatus: string;

  @ApiProperty({
    description: 'Última actividad registrada',
    example: '2024-01-15T10:30:00.000Z',
  })
  lastActivity: Date;

  @ApiProperty({
    description: 'Indica si el comercial está actualmente activo',
    example: true,
  })
  isActive: boolean;
}

/**
 * DTO para la respuesta de comerciales online
 */
export class OnlineCommercialsResponseDto {
  @ApiProperty({
    description: 'Lista de comerciales online',
    type: [CommercialSummaryDto],
  })
  commercials: CommercialSummaryDto[];

  @ApiProperty({
    description: 'Número total de comerciales online',
    example: 5,
  })
  count: number;

  @ApiProperty({
    description: 'Timestamp de cuando se generó la respuesta',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;
}

/**
 * DTO de respuesta para operaciones de conexión/desconexión
 */
export class CommercialOperationResponseDto {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje descriptivo de la operación',
    example: 'Comercial conectado exitosamente',
  })
  message: string;

  @ApiProperty({
    description: 'Datos del comercial después de la operación',
    type: CommercialSummaryDto,
    required: false,
  })
  commercial?: CommercialSummaryDto;
}

/**
 * DTO para la respuesta de disponibilidad de comerciales (endpoint público)
 * No expone información sensible de comerciales
 */
export class CommercialAvailabilityResponseDto {
  @ApiProperty({
    description: 'Indica si hay comerciales disponibles para atender',
    example: true,
  })
  available: boolean;

  @ApiProperty({
    description: 'Número de comerciales online y disponibles',
    example: 3,
  })
  onlineCount: number;

  @ApiProperty({
    description: 'Timestamp de cuando se generó la respuesta',
    example: '2025-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'ID del sitio consultado',
    example: 'site_1234567890',
  })
  siteId: string;
}
