import { ApiProperty } from '@nestjs/swagger';

// DTOs para Swagger
export class LoginRequestDto {
  @ApiProperty({
    description: 'El correo electrónico del usuario',
    example: 'usuario@ejemplo.com',
  })
  email: string;

  @ApiProperty({
    description: 'La contraseña del usuario',
    example: 'Password123!',
  })
  password: string;
}

export class RegisterRequestDto {
  @ApiProperty({
    description: 'El correo electrónico del usuario',
    example: 'usuario@ejemplo.com',
  })
  email: string;

  @ApiProperty({
    description: 'El nombre del usuario (opcional)',
    example: 'Juan Pérez',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description:
      'La contraseña del usuario (mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial)',
    example: 'Password123!',
  })
  password: string;

  @ApiProperty({
    description:
      'Roles asignados al usuario (opcional, por defecto "commercial")',
    example: ['commercial'],
    required: false,
    type: [String],
  })
  roles?: string[];
}

export class TokenResponseDto {
  @ApiProperty({
    description: 'Token de acceso JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Token de actualización JWT para renovar el token de acceso',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token: string;
}

export class RefreshTokenRequestDto {
  @ApiProperty({
    description: 'Token de actualización para renovar el token de acceso',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token: string;
}

export class RefreshTokenResponseDto {
  @ApiProperty({
    description: 'Nuevo token de acceso JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;
}

export class AcceptInviteRequestDto {
  @ApiProperty({
    description: 'Token de invitación recibido por correo electrónico',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description:
      'La contraseña del usuario (mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial)',
    example: 'Password123!',
  })
  password: string;
}
