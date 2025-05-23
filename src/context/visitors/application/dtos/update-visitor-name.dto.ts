import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// DTO para actualizar el nombre del visitante
export class UpdateVisitorNameDto {
  @ApiProperty({
    description: 'Nombre del visitante',
    example: 'Juan Pérez',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  name: string;
}
