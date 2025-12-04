import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Tipo de actividad que genera el heartbeat
 */
export enum ActivityType {
  /** Heartbeat automático: solo mantiene la sesión viva, no cambia el estado de conexión */
  HEARTBEAT = 'heartbeat',
  /** Interacción del usuario: actualiza actividad y reactiva a ONLINE si está AWAY/OFFLINE */
  USER_INTERACTION = 'user-interaction',
}

export class UpdateSessionHeartbeatDto {
  @ApiProperty({
    description: 'ID de la sesión activa (puede venir de cookie o body)',
    example: '550e8400-e29b-41d4-a716-446655440003',
    required: false,
  })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiProperty({
    description: 'ID del visitante (opcional para validación adicional)',
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
  })
  @IsString()
  @IsOptional()
  visitorId?: string;

  @ApiProperty({
    description:
      'Tipo de actividad que genera el heartbeat:\n' +
      '- `heartbeat`: Heartbeat automático periódico. Solo mantiene la sesión viva, NO cambia el estado de conexión.\n' +
      '- `user-interaction`: Interacción real del usuario (click, teclado, scroll). Actualiza actividad y reactiva a ONLINE si está AWAY/OFFLINE.\n\n' +
      'Si no se especifica, se asume `heartbeat` (backwards compatible).',
    enum: ActivityType,
    example: ActivityType.HEARTBEAT,
    required: false,
    default: ActivityType.HEARTBEAT,
  })
  @IsEnum(ActivityType, {
    message: 'El tipo de actividad debe ser "heartbeat" o "user-interaction"',
  })
  @IsOptional()
  activityType?: ActivityType;
}
