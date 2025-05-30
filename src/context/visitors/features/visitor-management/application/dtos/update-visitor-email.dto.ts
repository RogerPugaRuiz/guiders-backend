import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// DTO para actualizar el email del visitante
export class UpdateVisitorEmailDto {
  @ApiProperty({
    description: 'Correo electrónico del visitante',
    example: 'usuario@ejemplo.com',
  })
  @IsString()
  @IsEmail({}, { message: 'El formato del correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico no puede estar vacío' })
  email: string;
}
