import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para el estado de presencia de un participante del chat
 */
export class ParticipantPresenceDto {
  @ApiProperty({
    description: 'ID del usuario',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Tipo de usuario (commercial o visitor)',
    example: 'commercial',
    enum: ['commercial', 'visitor'],
  })
  userType: 'commercial' | 'visitor';

  @ApiProperty({
    description: 'Estado de conexión',
    example: 'online',
    enum: ['online', 'offline', 'away', 'busy', 'chatting'],
  })
  connectionStatus: string;

  @ApiProperty({
    description: 'Indica si el usuario está escribiendo actualmente',
    example: false,
  })
  isTyping: boolean;

  @ApiProperty({
    description: 'Timestamp de última actividad (si está disponible)',
    example: '2025-01-15T10:30:00.000Z',
    required: false,
  })
  lastActivity?: string;
}
