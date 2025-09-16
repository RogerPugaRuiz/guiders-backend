import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EndSessionDto {
  @ApiProperty({
    description: 'ID de la sesión a cerrar (puede venir de cookie o body)',
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
    description: 'Razón del cierre de sesión (opcional)',
    example: 'Usuario cerró la ventana',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
