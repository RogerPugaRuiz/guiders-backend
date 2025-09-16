import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthGuard,
  AuthenticatedRequest,
} from 'src/context/shared/infrastructure/guards/auth.guard';
import {
  RolesGuard,
  RequiredRoles,
} from 'src/context/shared/infrastructure/guards/role.guard';
import { GetVisitorByIdQuery } from '../../application/queries/get-visitor-by-id.query';
import { VisitorResponseDto } from '../../application/dtos/visitor-response.dto';
import { VisitorProfileDto } from '../../application/dtos/visitor-profile.dto';
import { UpdateVisitorEmailDto } from '../../application/dtos/update-visitor-email.dto';
import { UpdateVisitorNameDto } from '../../application/dtos/update-visitor-name.dto';
import { UpdateVisitorTelDto } from '../../application/dtos/update-visitor-tel.dto';
import { UpdateVisitorEmailCommand } from '../../application/commands/update-visitor-email.command';
import { UpdateVisitorNameCommand } from '../../application/commands/update-visitor-name.command';
import { UpdateVisitorTelCommand } from '../../application/commands/update-visitor-tel.command';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Result } from 'src/context/shared/domain/result';
import { VisitorPrimitives } from '../../domain/visitor.aggregate';

@ApiTags('Visitantes')
@Controller('visitor')
export class VisitorController {
  private readonly logger = new Logger(VisitorController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Obtiene la información del visitante autenticado (perfil propio)
   */
  @Get('me')
  @RequiredRoles('visitor')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener información del visitante autenticado',
    description:
      'Retorna la información del visitante basada en el token JWT autenticado. Permite al visitante obtener su propio perfil sin necesidad de conocer su ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Información del visitante obtenida exitosamente',
    type: VisitorProfileDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Usuario no autenticado - Token de autenticación requerido',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuario sin permisos suficientes - Requiere rol visitor',
  })
  @ApiResponse({
    status: 404,
    description: 'Visitante no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async getMyProfile(
    @Req() req: AuthenticatedRequest,
  ): Promise<VisitorProfileDto> {
    try {
      // Obtener el ID del visitante desde el token JWT
      const visitorId = req.user.id;

      this.logger.log(
        `Obteniendo perfil del visitante autenticado: ${visitorId}`,
      );

      // Ejecutar la query para obtener los datos del visitante
      const visitor = await this.queryBus.execute<
        GetVisitorByIdQuery,
        VisitorPrimitives | null
      >(new GetVisitorByIdQuery(visitorId));

      if (!visitor) {
        throw new HttpException(
          'Visitante no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      // Devolver solo los campos esenciales solicitados
      return {
        id: visitor.id,
        name: visitor.name,
        email: visitor.email,
        tel: visitor.tel,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get(':visitorId')
  @RequiredRoles('commercial')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener datos del visitante por ID',
    description: 'Obtiene los datos del visitante a partir del ID en la URL',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos del visitante obtenidos correctamente',
    type: VisitorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: token JWT inválido o ausente',
  })
  @ApiResponse({
    status: 404,
    description: 'Visitante no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado: Se requiere rol commercial',
  })
  async getVisitor(
    @Param('visitorId') visitorId: string,
  ): Promise<VisitorResponseDto> {
    try {
      if (!visitorId) {
        throw new HttpException(
          'ID de visitante no proporcionado',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Ejecutar la query para obtener los datos del visitante
      const visitor = await this.queryBus.execute<
        GetVisitorByIdQuery,
        VisitorPrimitives | null
      >(new GetVisitorByIdQuery(visitorId));

      if (!visitor) {
        throw new HttpException(
          'Visitante no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      return visitor as VisitorResponseDto;
    } catch (error) {
      this.handleError(error);
    }
  }

  @Put(':visitorId/email')
  @RequiredRoles('commercial')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar email del visitante',
    description: 'Actualiza el correo electrónico del visitante',
  })
  @ApiResponse({
    status: 200,
    description: 'Email actualizado correctamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: token JWT inválido o ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado: Se requiere rol commercial',
  })
  @ApiResponse({
    status: 404,
    description: 'Visitante no encontrado',
  })
  async updateEmail(
    @Param('visitorId') visitorId: string,
    @Body() dto: UpdateVisitorEmailDto,
  ): Promise<void> {
    try {
      if (!visitorId) {
        throw new HttpException(
          'ID de visitante no proporcionado',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Ejecutar el comando para actualizar el email
      const result = await this.commandBus.execute<
        UpdateVisitorEmailCommand,
        Result<void, DomainError>
      >(new UpdateVisitorEmailCommand(visitorId, dto.email));

      if (result.isErr()) {
        this.handleDomainError(result.error);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  @Put(':visitorId/name')
  @RequiredRoles('commercial')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar nombre del visitante',
    description: 'Actualiza el nombre del visitante',
  })
  @ApiResponse({
    status: 200,
    description: 'Nombre actualizado correctamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: token JWT inválido o ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado: Se requiere rol commercial',
  })
  @ApiResponse({
    status: 404,
    description: 'Visitante no encontrado',
  })
  async updateName(
    @Param('visitorId') visitorId: string,
    @Body() dto: UpdateVisitorNameDto,
  ): Promise<void> {
    try {
      if (!visitorId) {
        throw new HttpException(
          'ID de visitante no proporcionado',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Ejecutar el comando para actualizar el nombre
      const result = await this.commandBus.execute<
        UpdateVisitorNameCommand,
        Result<void, DomainError>
      >(new UpdateVisitorNameCommand(visitorId, dto.name));

      if (result.isErr()) {
        this.handleDomainError(result.error);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  @Put(':visitorId/tel')
  @RequiredRoles('commercial')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar teléfono del visitante',
    description: 'Actualiza el número de teléfono del visitante',
  })
  @ApiResponse({
    status: 200,
    description: 'Teléfono actualizado correctamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado: token JWT inválido o ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado: Se requiere rol commercial',
  })
  @ApiResponse({
    status: 404,
    description: 'Visitante no encontrado',
  })
  async updateTel(
    @Param('visitorId') visitorId: string,
    @Body() dto: UpdateVisitorTelDto,
  ): Promise<void> {
    try {
      if (!visitorId) {
        throw new HttpException(
          'ID de visitante no proporcionado',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Ejecutar el comando para actualizar el teléfono
      const result = await this.commandBus.execute<
        UpdateVisitorTelCommand,
        Result<void, DomainError>
      >(new UpdateVisitorTelCommand(visitorId, dto.tel));

      if (result.isErr()) {
        this.handleDomainError(result.error);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  // Método para manejar errores de dominio
  private handleDomainError(error: DomainError): void {
    this.logger.error(`Error de dominio: ${error.message}`);

    // Si el error contiene 'no encontrado', devuelve 404
    if (error.message.includes('no encontrado')) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }

    // Por defecto, devuelve 400 Bad Request para errores de dominio
    throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
  }

  // Método para manejar errores generales
  private handleError(error: unknown): never {
    // Si ya es una HttpException, la relanzamos
    if (error instanceof HttpException) {
      throw error;
    }

    // Si es un error conocido, lo registramos y devolvemos un error apropiado
    if (error instanceof Error) {
      this.logger.error(
        `Error en VisitorController: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.message || 'Error del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Para cualquier otro tipo de error
    this.logger.error(`Error desconocido en VisitorController`, error);
    throw new HttpException(
      'Error interno del servidor',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
