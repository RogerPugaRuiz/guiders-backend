import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

// DTO para actualizar el teléfono del visitante
export class UpdateVisitorTelDto {
  @ApiProperty({
    description: 'Número de teléfono del visitante',
    example: '+34612345678',
  })
  @IsString()
  @IsNotEmpty({ message: 'El teléfono no puede estar vacío' })
  @Matches(/^\+?[0-9\s\-()]{7,}$/, {
    message: 'El formato del teléfono no es válido',
  })
  tel: string;
}
