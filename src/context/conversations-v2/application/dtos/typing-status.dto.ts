import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para el estado de "escribiendo" de un usuario
 */
export class TypingStatusDto {
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
    description: 'Indica si el usuario está escribiendo',
    example: true,
  })
  isTyping: boolean;

  @ApiProperty({
    description: 'Timestamp del último cambio de estado',
    example: '2025-01-15T10:30:00.000Z',
  })
  timestamp: string;
}
