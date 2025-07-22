import { ApiProperty } from '@nestjs/swagger';

// DTO para respuesta del tiempo de conexión del visitante
export class VisitorConnectionTimeResponseDto {
  @ApiProperty({
    description: 'Tiempo de conexión de la sesión en milisegundos',
    nullable: true,
    example: 12500,
  })
  connectionTime: number | null;

  @ApiProperty({
    description: 'Tiempo de conexión formateado en formato legible',
    nullable: true,
    example: '12.5 segundos',
  })
  connectionTimeFormatted: string | null;
}
