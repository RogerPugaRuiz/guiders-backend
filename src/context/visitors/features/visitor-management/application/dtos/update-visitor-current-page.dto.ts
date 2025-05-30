import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// DTO para actualizar la página actual del visitante
export class UpdateVisitorCurrentPageDto {
  @ApiProperty({
    description: 'URL o identificador de la página actual',
    example: '/productos',
  })
  @IsString()
  @IsNotEmpty({ message: 'La página actual no puede estar vacía' })
  currentPage: string;
}
