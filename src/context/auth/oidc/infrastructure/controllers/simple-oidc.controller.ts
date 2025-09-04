import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { OidcAuthGuard } from '../guards/oidc-auth.guard';

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  provider: string;
  accessToken: string;
  refreshToken?: string;
}

@ApiTags('OIDC Authentication')
@Controller('auth/oidc')
export class SimpleOidcController {
  @Get('login')
  @ApiOperation({ summary: 'Iniciar autenticación OIDC' })
  @ApiResponse({
    status: 302,
    description: 'Redirección al proveedor OIDC',
  })
  @UseGuards(OidcAuthGuard)
  async login() {
    // Passport maneja la redirección automáticamente
  }

  @Get('callback')
  @ApiOperation({ summary: 'Callback de autenticación OIDC' })
  @ApiResponse({
    status: 200,
    description: 'Autenticación completada exitosamente',
  })
  @UseGuards(OidcAuthGuard)
  async callback(@Req() req: Request & { user: AuthenticatedUser }, @Res() res: Response): Promise<void> {
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
  @UseGuards(OidcAuthGuard)
  async getProfile(@Req() req: Request & { user: AuthenticatedUser }): Promise<any> {
    return {
      user: req.user,
    };
  }
}