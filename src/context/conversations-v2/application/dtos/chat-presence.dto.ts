import { ApiProperty } from '@nestjs/swagger';
import { ParticipantPresenceDto } from './participant-presence.dto';

/**
 * DTO para el estado de presencia de todos los participantes de un chat
 */
export class ChatPresenceDto {
  @ApiProperty({
    description: 'ID del chat',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  chatId: string;

  @ApiProperty({
    description: 'Lista de participantes y su estado de presencia',
    type: [ParticipantPresenceDto],
  })
  participants: ParticipantPresenceDto[];

  @ApiProperty({
    description: 'Timestamp de cuando se consultó el estado',
    example: '2025-01-15T10:30:00.000Z',
  })
  timestamp: string;
}
