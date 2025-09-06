import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { BFFAuthService } from '../bff-auth.service';
import { JwtCookieAuthGuard } from 'src/context/shared/infrastructure/guards/jwt-cookie-auth.guard';
import {
  BFFLoginRequestDto,
  BFFLoginResponseDto,
  BFFRefreshResponseDto,
  BFFLogoutResponseDto,
  BFFMeResponseDto,
} from '../dtos/bff-auth.dto';

@ApiTags('BFF Authentication')
@Controller('bff/auth')
export class BFFAuthController {
  private readonly logger = new Logger(BFFAuthController.name);

  constructor(private readonly bffAuthService: BFFAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión (BFF con cookies HttpOnly)',
    description:
      'Autentica el usuario con Keycloak y establece cookies HttpOnly para el manejo seguro de tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso - cookies configuradas',
    type: BFFLoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas',
  })
  @ApiResponse({
    status: 400,
    description: 'Error de validación en los datos de entrada',
  })
  async login(
    @Body() loginDto: BFFLoginRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BFFLoginResponseDto> {
    try {
      this.logger.log(`Intento de login para usuario: ${loginDto.username}`);

      const result = await this.bffAuthService.loginWithKeycloak(
        loginDto.username,
        loginDto.password,
        response,
      );

      return {
        success: true,
        message: 'Autenticación exitosa',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        user: result.user,
      };
    } catch (error) {
      this.logger.error(
        `Error en login para ${loginDto.username}:`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.message,
      );
      throw error;
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar token de acceso',
    description:
      'Utiliza el refresh token de la cookie para obtener un nuevo access token',
  })
  @ApiCookieAuth('refresh_token')
  @ApiResponse({
    status: 200,
    description: 'Token renovado exitosamente',
    type: BFFRefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Token de renovación inválido o expirado',
  })
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BFFRefreshResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const refreshToken = request.cookies['refresh_token'];

    if (!refreshToken) {
      this.logger.warn('Intento de renovación sin refresh token');
      throw new UnauthorizedException('Token de renovación no encontrado');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await this.bffAuthService.refreshToken(refreshToken, response);
      this.logger.log('Token renovado exitosamente');

      return {
        success: true,
        message: 'Token renovado exitosamente',
      };
    } catch (error) {
      this.logger.error(
        'Error renovando token:',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.message,
      );
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(JwtCookieAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar sesión',
    description: 'Cierra la sesión del usuario y limpia las cookies HttpOnly',
  })
  @ApiCookieAuth('access_token')
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada correctamente',
    type: BFFLogoutResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - token requerido',
  })
  logout(
    @Res({ passthrough: true }) response: Response,
    @Req() request: any,
  ): BFFLogoutResponseDto {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const userEmail = request.user?.email || request.user?.sub || 'unknown';
      this.logger.log(`Logout para usuario: ${userEmail}`);

      this.bffAuthService.logout(response);

      return {
        success: true,
        message: 'Sesión cerrada exitosamente',
      };
    } catch (error) {
      this.logger.error(
        'Error en logout:',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.message,
      );
      throw error;
    }
  }

  @Get('me')
  @UseGuards(JwtCookieAuthGuard)
  @ApiOperation({
    summary: 'Obtener información del usuario autenticado',
    description:
      'Devuelve la información del usuario basada en el token presente en la cookie',
  })
  @ApiCookieAuth('access_token')
  @ApiResponse({
    status: 200,
    description: 'Información del usuario obtenida exitosamente',
    type: BFFMeResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - token requerido',
  })
  getMe(@Req() request: any): BFFMeResponseDto {
    return {
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      user: request.user,
    };
  }
}
