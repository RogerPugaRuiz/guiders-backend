import { IsNotEmpty, IsNumber, IsPositive, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVisitorConnectionTimeDto {
  @ApiProperty({
    description: 'Tiempo de conexión en milisegundos',
    example: 5000,
    minimum: 0,
  })
  @IsNotEmpty({ message: 'El tiempo de conexión es obligatorio' })
  @IsNumber({}, { message: 'El tiempo de conexión debe ser un número' })
  @IsInt({ message: 'El tiempo de conexión debe ser un número entero' })
  @IsPositive({ message: 'El tiempo de conexión debe ser positivo' })
  connectionTime: number;
}
