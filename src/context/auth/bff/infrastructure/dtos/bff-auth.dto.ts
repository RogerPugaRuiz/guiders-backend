import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export interface UserInfo {
  sub: string;
  email: string;
  roles: string[];
  companyId: string;
}

export interface SessionInfo {
  exp?: number;
  iat?: number;
}

export class BFFLoginRequestDto {
  @ApiProperty({
    description: 'Nombre de usuario o email',
    example: 'usuario@ejemplo.com',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class BFFLoginResponseDto {
  @ApiProperty({
    description: 'Indica si el login fue exitoso',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje descriptivo',
    example: 'Autenticación exitosa',
  })
  message: string;

  @ApiProperty({
    description: 'Información del usuario autenticado',
    example: {
      sub: '12345',
      email: 'usuario@ejemplo.com',
      roles: ['admin', 'user'],
    },
  })
  user?: UserInfo;
}

export class BFFRefreshResponseDto {
  @ApiProperty({
    description: 'Indica si la renovación fue exitosa',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje descriptivo',
    example: 'Token renovado exitosamente',
  })
  message: string;
}

export class BFFLogoutResponseDto {
  @ApiProperty({
    description: 'Indica si el logout fue exitoso',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje descriptivo',
    example: 'Sesión cerrada exitosamente',
  })
  message: string;
}

export class BFFMeResponseDto {
  @ApiProperty({
    description: 'ID del usuario en Keycloak (subject claim del JWT)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sub: string;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'usuario@ejemplo.com',
  })
  email: string;

  @ApiProperty({
    description: 'Roles del usuario',
    example: ['admin', 'commercial'],
    type: [String],
  })
  roles: string[];

  @ApiProperty({
    description: 'ID de la compañía a la que pertenece el usuario',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  companyId: string;

  @ApiProperty({
    description: 'Aplicación desde la que se autenticó',
    example: 'console',
    enum: ['console', 'admin'],
  })
  app: string;

  @ApiProperty({
    description:
      'Información de la sesión (timestamps de expiración y emisión)',
    example: { exp: 1735923600, iat: 1735920000 },
  })
  session: {
    exp?: number;
    iat?: number;
  };
}
