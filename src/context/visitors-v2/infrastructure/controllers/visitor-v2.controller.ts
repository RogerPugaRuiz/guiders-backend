import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Response,
  HttpCode,
  Req,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { DualAuthGuard } from '../../../shared/infrastructure/guards/dual-auth.guard';
import { RolesGuard } from '../../../shared/infrastructure/guards/role.guard';
import { Roles } from '../../../shared/infrastructure/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';
import { IdentifyVisitorDto } from '../../application/dtos/identify-visitor.dto';
import { IdentifyVisitorResponseDto } from '../../application/dtos/identify-visitor-response.dto';
import { IdentifyVisitorCommand } from '../../application/commands/identify-visitor.command';
import { EndSessionDto } from '../../application/dtos/end-session.dto';
import { EndSessionCommand } from '../../application/commands/end-session.command';
import { ChangeVisitorStatusDto } from '../../application/dtos/change-visitor-status.dto';
import { ChangeVisitorConnectionStatusCommand } from '../../application/commands/change-visitor-connection-status.command';
import {
  setVisitorSessionCookie,
  resolveVisitorSessionId,
  clearVisitorSessionCookie,
} from '../http/visitor-session-cookie.util';
import { GetVisitorCurrentPageQuery } from '../../application/queries/get-visitor-current-page.query';
import { GetVisitorCurrentPageResponseDto } from '../../application/dtos/get-visitor-current-page-response.dto';
import { GetVisitorActivityQuery } from '../../application/queries/get-visitor-activity.query';
import { GetVisitorActivityResponseDto } from '../../application/dtos/get-visitor-activity-response.dto';
import { GetVisitorSiteQuery } from '../../application/queries/get-visitor-site.query';
import { GetVisitorSiteResponseDto } from '../../application/dtos/get-visitor-site-response.dto';

@ApiTags('visitors')
@Controller('visitors')
export class VisitorV2Controller {
  private readonly logger = new Logger(VisitorV2Controller.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('identify')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Identificar visitante',
    description:
      'Registra o actualiza un visitante en el sistema usando dominio y API Key. ' +
      'El sistema valida automáticamente la API Key contra el dominio proporcionado, ' +
      'resuelve el tenantId y siteId internamente, y procede a identificar al visitante. ' +
      'Si el fingerprint ya existe en el sitio, actualiza al visitante existente. ' +
      'Si no existe, crea un nuevo Visitor en estado inicial (anónimo). ' +
      'Inicia una nueva Session asociada al visitante y devuelve un identificador de sesión en cookie HttpOnly.',
  })
  @ApiBody({
    description: 'Datos del visitante para identificación',
    examples: {
      example1: {
        summary: 'Visitante nuevo',
        description:
          'Ejemplo de identificación de un visitante nuevo con todos los campos',
        value: {
          fingerprint: 'fp_1234567890abcdef',
          domain: 'landing.mytech.com',
          apiKey: 'ak_live_1234567890abcdef',
          currentUrl: 'https://landing.mytech.com/home',
        },
      },
      example2: {
        summary: 'Visitante mínimo',
        description: 'Ejemplo con campos mínimos requeridos',
        value: {
          fingerprint: 'fp_abcdef1234567890',
          domain: 'blog.mytech.com',
          apiKey: 'ak_live_abcdef1234567890',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Visitante identificado exitosamente',
    type: IdentifyVisitorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos proporcionados (campos faltantes, formato incorrecto, API Key inválida)',
  })
  @ApiResponse({
    status: 401,
    description: 'API Key no válida para el dominio proporcionado',
  })
  @ApiResponse({
    status: 404,
    description: 'Dominio no encontrado en el sistema',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async identifyVisitor(
    @Body() identifyVisitorDto: IdentifyVisitorDto,
    @Req() request: ExpressRequest,
    @Response({ passthrough: true }) response: ExpressResponse,
  ): Promise<IdentifyVisitorResponseDto> {
    try {
      // Extraer IP y User-Agent para cumplimiento RGPD
      const ipAddress =
        (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        request.socket.remoteAddress ||
        'unknown';
      const userAgent = request.headers['user-agent'];

      const cookieHeader = request.headers.cookie;

      const command = new IdentifyVisitorCommand(
        identifyVisitorDto.fingerprint,
        identifyVisitorDto.domain,
        identifyVisitorDto.apiKey,
        identifyVisitorDto.hasAcceptedPrivacyPolicy,
        ipAddress,
        userAgent,
        cookieHeader,
        identifyVisitorDto.currentUrl,
        identifyVisitorDto.consentVersion,
      );

      const result = await this.commandBus.execute<
        IdentifyVisitorCommand,
        IdentifyVisitorResponseDto
      >(command);

      // Setear cookie HttpOnly con util centralizado
      setVisitorSessionCookie(response, result.sessionId);

      return result;
    } catch (error) {
      this.logger.error('Error al identificar visitante:', error);

      // Si es un error de validación o datos inválidos
      if (
        error instanceof Error &&
        (error.message?.includes('inválido') ||
          error.message?.includes('invalid'))
      ) {
        throw new BadRequestException(error.message);
      }

      // Error genérico del servidor
      throw new InternalServerErrorException(
        'Error interno al identificar visitante',
      );
    }
  }

  @Post('session/end')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Cerrar sesión de visitante',
    description:
      'Cierra explícitamente una sesión de visitante. Marca la sesión como terminada (ya no se cuenta como activa). Dispara eventos de negocio para sacar al visitante de la lista de "online", cerrar chats pendientes, etc.',
  })
  @ApiOkResponse({
    description: 'Sesión cerrada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o sesión no encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Sesión no encontrada',
  })
  async endSession(
    @Body() endSessionDto: EndSessionDto,
    @Req() request: ExpressRequest,
    @Response({ passthrough: true }) response: ExpressResponse,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Obtener sessionId centralizado (body precede a cookie)
      const sessionId = resolveVisitorSessionId(
        request,
        endSessionDto.sessionId,
      );

      if (!sessionId) {
        throw new BadRequestException('SessionId no proporcionado');
      }

      const command = new EndSessionCommand(
        sessionId,
        endSessionDto.visitorId,
        endSessionDto.reason,
      );

      await this.commandBus.execute<EndSessionCommand, void>(command);

      // Limpiar cookie de sesión usando util centralizado
      clearVisitorSessionCookie(response);

      return {
        success: true,
        message: 'Sesión cerrada exitosamente',
      };
    } catch (error) {
      this.logger.error('Error al cerrar sesión:', error);

      // Sesión no encontrada
      if (
        error instanceof Error &&
        error.message?.includes('Sesión no encontrada')
      ) {
        throw new NotFoundException(error.message);
      }

      // Datos inválidos
      if (
        error instanceof BadRequestException ||
        (error instanceof Error &&
          (error.message?.includes('inválido') ||
            error.message?.includes('invalid')))
      ) {
        throw new BadRequestException(
          error instanceof BadRequestException
            ? error.message
            : error.message || 'Datos inválidos',
        );
      }

      // Error genérico del servidor
      throw new InternalServerErrorException('Error interno al cerrar sesión');
    }
  }

  @Put('status')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Cambiar estado de conexión del visitante',
    description:
      'Permite a un visitante cambiar manualmente su estado de conexión (online, chatting, away, offline). ' +
      'Este endpoint es útil para que el visitante indique su disponibilidad o estado actual.',
  })
  @ApiBody({ type: ChangeVisitorStatusDto })
  @ApiOkResponse({
    description: 'Estado cambiado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o estado no permitido',
  })
  @ApiResponse({
    status: 404,
    description: 'Visitante no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async changeVisitorStatus(
    @Body() changeStatusDto: ChangeVisitorStatusDto,
  ): Promise<{ success: boolean; message: string; status: string }> {
    try {
      this.logger.log(
        `Cambiando estado de visitante ${changeStatusDto.id} a ${changeStatusDto.status}`,
      );

      const command = new ChangeVisitorConnectionStatusCommand(
        changeStatusDto.id,
        changeStatusDto.status,
      );

      await this.commandBus.execute<ChangeVisitorConnectionStatusCommand, void>(
        command,
      );

      return {
        success: true,
        message: `Estado cambiado a ${changeStatusDto.status} exitosamente`,
        status: changeStatusDto.status,
      };
    } catch (error) {
      this.logger.error(
        `Error al cambiar estado del visitante ${changeStatusDto.id}:`,
        error,
      );

      // Visitante no encontrado
      if (error instanceof Error && error.message?.includes('no encontrado')) {
        throw new NotFoundException(error.message);
      }

      // Estado inválido
      if (
        error instanceof Error &&
        (error.message?.includes('inválido') ||
          error.message?.includes('invalid'))
      ) {
        throw new BadRequestException(error.message);
      }

      // Error genérico del servidor
      throw new InternalServerErrorException(
        'Error interno al cambiar estado del visitante',
      );
    }
  }

  @Get(':visitorId/current-page')
  @UseGuards(DualAuthGuard, RolesGuard)
  @Roles(['commercial'])
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener la página actual del visitante',
    description:
      'Retorna la URL de la página que está visitando actualmente un usuario específico. ' +
      'Este endpoint permite a los comerciales conocer en qué página se encuentra un visitante ' +
      'para poder ofrecer asistencia contextualizada.\n\n' +
      '**Requisitos:**\n' +
      '- Autenticación: JWT Bearer token o cookie de sesión BFF\n' +
      '- Rol requerido: `commercial`\n\n' +
      '**Notas:**\n' +
      '- El campo `currentUrl` será `null` si el visitante nunca ha enviado su URL actual\n' +
      '- La URL se actualiza cuando el visitante llama a `/visitors/identify` con el parámetro `currentUrl`',
  })
  @ApiParam({
    name: 'visitorId',
    description: 'ID único del visitante (UUID)',
    example: '9598b495-205c-46af-9c06-d5dffb28ee21',
    type: String,
  })
  @ApiOkResponse({
    description: 'Página actual del visitante obtenida exitosamente',
    type: GetVisitorCurrentPageResponseDto,
    schema: {
      example: {
        currentUrl: 'https://example.com/products/laptop-gaming',
        updatedAt: '2025-11-19T19:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado - Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos - Se requiere rol de comercial',
  })
  @ApiResponse({
    status: 404,
    description: 'Visitante no encontrado con el ID proporcionado',
  })
  async getVisitorCurrentPage(
    @Param('visitorId') visitorId: string,
  ): Promise<GetVisitorCurrentPageResponseDto> {
    this.logger.log(`Obteniendo página actual del visitante: ${visitorId}`);

    const query = new GetVisitorCurrentPageQuery(visitorId);
    return this.queryBus.execute<
      GetVisitorCurrentPageQuery,
      GetVisitorCurrentPageResponseDto
    >(query);
  }

  @Get(':visitorId/activity')
  @UseGuards(DualAuthGuard, RolesGuard)
  @Roles(['commercial'])
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener estadísticas de actividad del visitante',
    description:
      'Retorna las estadísticas de actividad de un visitante específico, incluyendo:\n' +
      '- Número total de sesiones\n' +
      '- Número total de chats\n' +
      '- Número total de páginas visitadas\n' +
      '- Tiempo total conectado en milisegundos\n' +
      '- Estado de conexión actual\n' +
      '- Ciclo de vida del visitante\n\n' +
      '**Requisitos:**\n' +
      '- Autenticación: JWT Bearer token o cookie de sesión BFF\n' +
      '- Rol requerido: `commercial`',
  })
  @ApiParam({
    name: 'visitorId',
    description: 'ID único del visitante (UUID)',
    example: '9598b495-205c-46af-9c06-d5dffb28ee21',
    type: String,
  })
  @ApiOkResponse({
    description: 'Estadísticas de actividad obtenidas exitosamente',
    type: GetVisitorActivityResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado - Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos - Se requiere rol de comercial',
  })
  @ApiResponse({
    status: 404,
    description: 'Visitante no encontrado con el ID proporcionado',
  })
  async getVisitorActivity(
    @Param('visitorId') visitorId: string,
  ): Promise<GetVisitorActivityResponseDto> {
    this.logger.log(`Obteniendo actividad del visitante: ${visitorId}`);

    const query = new GetVisitorActivityQuery(visitorId);
    return this.queryBus.execute<
      GetVisitorActivityQuery,
      GetVisitorActivityResponseDto
    >(query);
  }

  @Get(':visitorId/site')
  @UseGuards(DualAuthGuard, RolesGuard)
  @Roles(['commercial', 'admin'])
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener el siteId de un visitante',
    description:
      'Retorna el siteId y tenantId asociados a un visitante específico.\n\n' +
      '**Requisitos:**\n' +
      '- Autenticación: JWT Bearer token o cookie de sesión BFF\n' +
      '- Rol requerido: `commercial` o `admin`',
  })
  @ApiParam({
    name: 'visitorId',
    description: 'ID único del visitante (UUID)',
    example: '9598b495-205c-46af-9c06-d5dffb28ee21',
    type: String,
  })
  @ApiOkResponse({
    description: 'SiteId del visitante obtenido exitosamente',
    type: GetVisitorSiteResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado - Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos - Se requiere rol de commercial o admin',
  })
  @ApiResponse({
    status: 404,
    description: 'Visitante no encontrado con el ID proporcionado',
  })
  async getVisitorSite(
    @Param('visitorId') visitorId: string,
  ): Promise<GetVisitorSiteResponseDto> {
    this.logger.log(`Obteniendo siteId del visitante: ${visitorId}`);

    const query = new GetVisitorSiteQuery(visitorId);
    return this.queryBus.execute<
      GetVisitorSiteQuery,
      GetVisitorSiteResponseDto
    >(query);
  }
}
