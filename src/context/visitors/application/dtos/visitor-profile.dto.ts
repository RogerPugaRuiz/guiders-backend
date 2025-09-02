import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para el perfil básico del visitante
 * Contiene solo la información esencial que un visitante puede ver de sí mismo
 */
export class VisitorProfileDto {
  @ApiProperty({ 
    description: 'ID único del visitante',
    example: 'bd84b08a-d5e9-4961-84f2-247c0916a1c1'
  })
  id: string;

  @ApiProperty({ 
    description: 'Nombre del visitante', 
    nullable: true,
    example: 'Juan Pérez'
  })
  name: string | null;

  @ApiProperty({
    description: 'Correo electrónico del visitante',
    nullable: true,
    example: 'juan.perez@ejemplo.com'
  })
  email: string | null;

  @ApiProperty({ 
    description: 'Teléfono del visitante', 
    nullable: true,
    example: '+34 612 345 678'
  })
  tel: string | null;
}
