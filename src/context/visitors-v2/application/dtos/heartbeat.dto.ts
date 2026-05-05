import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type HeartbeatActivityType = 'heartbeat' | 'user-interaction';

export class HeartbeatDto {
  @ApiPropertyOptional({
    description:
      'ID de la sesión del visitante (puede venir de cookie o header x-guiders-sid)',
    example: 'sess_1758226307441_visitor',
  })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Tipo de actividad que origina el heartbeat',
    enum: ['heartbeat', 'user-interaction'],
    default: 'heartbeat',
    example: 'heartbeat',
  })
  @IsEnum(['heartbeat', 'user-interaction'])
  @IsOptional()
  activityType?: HeartbeatActivityType;
}
