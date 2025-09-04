import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiExtraModels,
  ApiFoundResponse,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { OidcAuthGuard } from '../guards/oidc-auth.guard';

// DTOs documentados para exponer adecuadamente el contrato en Swagger
class OidcUserDto {
  // Identificador interno del usuario autenticado (puede provenir del Id token o sistema interno)
  id!: string;
  // Correo electrónico validado por el proveedor OIDC
  email!: string;
  // Nombre completo reportado por el proveedor OIDC
  name!: string;
  // Nombre del proveedor OIDC (ej: 'google', 'azure-ad')
  provider!: string;
}

class OidcCallbackSuccessResponseDto {
  // Mensaje informativo de resultado
  message!: string;
  // Datos básicos del usuario autenticado
  user!: OidcUserDto;
  // Token de acceso temporal (placeholder hasta integrar emisión JWT propia)
  accessToken!: string;
}

class OidcProfileResponseDto {
  // Usuario autenticado reconstruido desde la sesión / request
  user!: OidcUserDto & { accessToken?: string; refreshToken?: string };
}

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  provider: string;
  accessToken: string;
  refreshToken?: string;
}

@ApiTags('OIDC Authentication')
@ApiExtraModels(
  OidcUserDto,
  OidcCallbackSuccessResponseDto,
  OidcProfileResponseDto,
)
@Controller('auth/oidc')
export class OidcController {
  @Get('login')
  @ApiOperation({ summary: 'Iniciar autenticación OIDC' })
  @ApiFoundResponse({
    description:
      'Redirección al endpoint de autorización del proveedor OIDC. El navegador será enviado al proveedor para continuar el flujo Authorization Code (PKCE si está habilitado).',
  })
  @ApiInternalServerErrorResponse({
    description: 'Error interno preparando la solicitud OIDC',
  })
  @UseGuards(OidcAuthGuard)
  login(): void {
    // Redirección gestionada por Passport
  }

  @Get('callback')
  @ApiOperation({ summary: 'Callback de autenticación OIDC' })
  @ApiOkResponse({
    description: 'Autenticación completada exitosamente',
    schema: {
      example: {
        message: 'Autenticación OIDC exitosa',
        user: {
          id: 'd8b9c4a2-7a21-4d9e-9f1e-123456789abc',
          email: 'usuario@empresa.com',
          name: 'Nombre Apellido',
          provider: 'google',
        },
        accessToken: 'temporary-jwt-token',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description:
      'Fallo de autenticación (código denegado, intercambio de tokens inválido, usuario canceló o proveedor devolvió error).',
  })
  @ApiInternalServerErrorResponse({
    description: 'Error inesperado procesando el callback OIDC',
  })
  @UseGuards(OidcAuthGuard)
  callback(
    @Req() req: Request & { user: AuthenticatedUser },
    @Res() res: Response,
  ): void {
    const user = req.user;

    // Por ahora, simplemente devolver la información del usuario
    res.json({
      message: 'Autenticación OIDC exitosa',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
      },
      // En una implementación real, aquí generarías tokens JWT propios
      accessToken: 'temporary-jwt-token',
    });
  }

  @Get('profile')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiOkResponse({
    description: 'Perfil reconstruido desde la sesión tras autenticación OIDC',
    schema: {
      example: {
        user: {
          id: 'd8b9c4a2-7a21-4d9e-9f1e-123456789abc',
          email: 'usuario@empresa.com',
          name: 'Nombre Apellido',
          provider: 'google',
          accessToken: 'optional-temporary-token',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'No existe sesión OIDC válida o expiró',
  })
  @UseGuards(OidcAuthGuard)
  getProfile(@Req() req: Request & { user: AuthenticatedUser }) {
    return { user: req.user };
  }
}
