import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export interface UserInfo {
  sub: string;
  email?: string;
  roles: string[];
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
    description: 'Indica si la petición fue exitosa',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Información del usuario autenticado',
    example: {
      sub: '12345',
      email: 'usuario@ejemplo.com',
      roles: ['admin', 'user'],
    },
  })
  user: UserInfo;
}
