// DTO para la respuesta del usuario autenticado actual (/me)
// Ubicación: src/context/auth/auth-user/application/dtos/current-user-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CurrentUserResponseDto {
  @ApiProperty({ description: 'Identificador único del usuario' })
  id: string;

  @ApiProperty({ description: 'Correo electrónico del usuario' })
  email: string;

  @ApiProperty({ description: 'Nombre visible del usuario' })
  name: string;

  @ApiProperty({ type: [String], description: 'Roles asignados' })
  roles: string[];

  @ApiProperty({ description: 'Identificador de la compañía asociada' })
  companyId: string;

  @ApiProperty({ description: 'Indica si el usuario está activo' })
  isActive: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Fecha de creación',
  })
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Fecha de última actualización',
  })
  updatedAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    required: false,
    nullable: true,
    description: 'Fecha de último inicio de sesión (puede ser null)',
  })
  lastLoginAt: Date | null;
}
