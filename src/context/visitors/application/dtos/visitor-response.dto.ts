import { ApiProperty } from '@nestjs/swagger';

// DTO para respuesta de visitante
export class VisitorResponseDto {
  @ApiProperty({ description: 'ID único del visitante' })
  id: string;

  @ApiProperty({ description: 'Nombre del visitante', nullable: true })
  name: string | null;

  @ApiProperty({
    description: 'Correo electrónico del visitante',
    nullable: true,
  })
  email: string | null;

  @ApiProperty({ description: 'Teléfono del visitante', nullable: true })
  tel: string | null;

  @ApiProperty({
    description: 'Etiquetas asociadas al visitante',
    type: [String],
  })
  tags: string[];
}
