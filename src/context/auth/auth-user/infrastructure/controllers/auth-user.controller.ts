import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Headers,
  UnauthorizedException,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthUserService } from '../services/auth-user.service';
import { ValidationError } from 'src/context/shared/domain/validation.error';
import { UserAlreadyExistsError } from '../../application/errors/user-already-exists.error';
import { UnauthorizedError } from '../../application/errors/unauthorized.error';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AcceptInviteCommand } from '../../application/commands/accept-invite.command';
import { AuthGuard } from 'src/context/shared/infrastructure/guards/auth.guard';
import { FindUsersByCompanyIdQuery } from '../../application/queries/find-users-by-company-id.query';
import { UserListResponseDto } from '../../application/dtos/user-list-response.dto';
import { UserAccountPrimitives } from '../../domain/user-account';
import { UserAccountCompanyId } from '../../domain/value-objects/user-account-company-id';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import {
  LoginRequestDto,
  TokenResponseDto,
  RegisterRequestDto,
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
  AcceptInviteRequestDto,
} from '../dtos/auth-user.dto';
import {
  RequiredRoles,
  RolesGuard,
} from 'src/context/shared/infrastructure/guards/role.guard';

@ApiTags('Autenticación de Usuarios')
@Controller('user/auth')
export class AuthUserController {
  private readonly logger = new Logger(AuthUserController.name);
  constructor(
    private readonly authUserService: AuthUserService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión de usuario',
    description:
      'Verifica las credenciales y devuelve tokens de acceso y actualización',
  })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Usuario autenticado correctamente',
    type: TokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Error de validación (formato de email incorrecto)',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    try {
      const tokens = await this.authUserService.login(email, password);
      return {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      };
    } catch (error) {
      this.logger.error('Error logging in user', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof UnauthorizedError) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('register')
  @ApiOperation({
    summary: 'Registrar un nuevo usuario',
    description: 'Crea un nuevo usuario en el sistema con el rol especificado',
  })
  @ApiBody({ type: RegisterRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Usuario registrado correctamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'Error de validación (formato de email incorrecto, contraseña no cumple requisitos)',
  })
  @ApiResponse({
    status: 409,
    description: 'El usuario ya existe',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  @RequiredRoles('admin')
  @UseGuards(AuthGuard, RolesGuard)
  async register(
    @Body('email') email: string,
    @Body('name') name: string,
    @Body('roles') roles: string[],
    @Req() req: { user: { companyId: string } },
  ): Promise<void> {
    try {
      await this.authUserService.register(email, req.user.companyId, roles);
    } catch (error) {
      this.logger.error('Error registering user', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof UserAlreadyExistsError) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Renovar token de acceso',
    description:
      'Utiliza un token de actualización para obtener un nuevo token de acceso',
  })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Token renovado correctamente',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Error de validación (token mal formado)',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de actualización inválido o expirado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async refresh(@Body('refreshToken') refreshToken: string) {
    try {
      const tokens = await this.authUserService.refresh(refreshToken);
      return {
        accessToken: tokens.accessToken,
      };
    } catch (error) {
      this.logger.error('Error refreshing token', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof UnauthorizedError) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Cerrar sesión',
    description: 'Cierra la sesión del usuario y revoca sus tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada correctamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async logout() {
    try {
      await this.authUserService.logout();
    } catch (error) {
      this.logger.error('Error logging out user', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof UnauthorizedError) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      } else {
        throw new HttpException(
          'Internal server error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  @Get('validate')
  @ApiOperation({
    summary: 'Validar token de acceso',
    description: 'Verifica que el token de acceso sea válido',
  })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'Authorization',
    description: 'Token de acceso con formato Bearer',
    required: true,
    schema: { type: 'string', default: 'Bearer <token>' },
  })
  @ApiResponse({
    status: 204,
    description: 'Token válido',
  })
  @ApiResponse({
    status: 400,
    description: 'Error de validación (token mal formado)',
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido o expirado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async validate(@Headers('Authorization') bearerToken: string) {
    const [prefix, accessToken] = bearerToken.split(' ');
    if (prefix !== 'Bearer') {
      throw new HttpException('Invalid token', HttpStatus.BAD_REQUEST);
    }
    try {
      await this.authUserService.validate(accessToken);
      return;
    } catch (error) {
      this.logger.error('Error validating token', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof UnauthorizedException) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('accept-invite')
  @ApiOperation({
    summary: 'Aceptar invitación',
    description:
      'Acepta una invitación para unirse a una compañía y establece la contraseña',
  })
  @ApiBody({ type: AcceptInviteRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Invitación aceptada correctamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'Error de validación (token inválido o contraseña no cumple requisitos)',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de invitación inválido o expirado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async acceptInvite(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    try {
      const command = new AcceptInviteCommand(token, password);
      await this.commandBus.execute(command);
    } catch (error) {
      this.logger.error('Error accepting invite', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error instanceof UnauthorizedError) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('company-users')
  @ApiOperation({
    summary: 'Listar usuarios de la compañía',
    description: 'Devuelve los usuarios asociados a la compañía del token JWT',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Listado de usuarios',
    type: UserListResponseDto,
  })
  @RequiredRoles('admin')
  @UseGuards(AuthGuard, RolesGuard)
  async listCompanyUsers(@Req() req: any): Promise<UserListResponseDto> {
    // Extrae el companyId del payload del token (req.user)
    const companyId = (req as { user?: { companyId?: string } }).user
      ?.companyId;
    if (!companyId) {
      throw new HttpException('No companyId in token', HttpStatus.UNAUTHORIZED);
    }
    // Ejecuta la query CQRS para obtener los usuarios
    const users: UserAccountPrimitives[] = await this.queryBus.execute(
      new FindUsersByCompanyIdQuery(UserAccountCompanyId.create(companyId)),
    );
    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        roles: u.roles,
        companyId: u.companyId,
        isActive: u.isActive, // Exponer el estado activo/inactivo
      })),
    };
  }
}
