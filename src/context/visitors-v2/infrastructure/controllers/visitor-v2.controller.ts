import {
  Controller,
  Post,
  Body,
  Response,
  HttpCode,
  Req,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiBody,
} from '@nestjs/swagger';
import {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';
import { IdentifyVisitorDto } from '../../application/dtos/identify-visitor.dto';
import { IdentifyVisitorResponseDto } from '../../application/dtos/identify-visitor-response.dto';
import { IdentifyVisitorCommand } from '../../application/commands/identify-visitor.command';
import { UpdateSessionHeartbeatDto } from '../../application/dtos/update-session-heartbeat.dto';
import { UpdateSessionHeartbeatCommand } from '../../application/commands/update-session-heartbeat.command';
import { EndSessionDto } from '../../application/dtos/end-session.dto';
import { EndSessionCommand } from '../../application/commands/end-session.command';
import {
  setVisitorSessionCookie,
  resolveVisitorSessionId,
  clearVisitorSessionCookie,
} from '../http/visitor-session-cookie.util';

@ApiTags('visitors')
@Controller('visitors')
export class VisitorV2Controller {
  private readonly logger = new Logger(VisitorV2Controller.name);

  constructor(private readonly commandBus: CommandBus) {}

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

      const command = new IdentifyVisitorCommand(
        identifyVisitorDto.fingerprint,
        identifyVisitorDto.domain,
        identifyVisitorDto.apiKey,
        identifyVisitorDto.hasAcceptedPrivacyPolicy,
        ipAddress,
        userAgent,
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

  @Post('session/heartbeat')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Actualizar heartbeat de sesión',
    description:
      'Mantiene viva la sesión abierta. Actualiza el timestamp de última actividad (lastActivityAt). ' +
      'Mientras se reciban heartbeats, el visitante se considera online.\n\n' +
      '**Frecuencia recomendada de heartbeat desde el frontend:**\n' +
      '- Visitantes ANON: cada 30-60 segundos (timeout: 5 minutos)\n' +
      '- Visitantes ENGAGED: cada 60-90 segundos (timeout: 15 minutos)\n' +
      '- Visitantes LEAD: cada 2-3 minutos (timeout: 30 minutos)\n' +
      '- Visitantes CONVERTED: cada 5 minutos (timeout: 60 minutos)\n\n' +
      'El sistema verifica sesiones expiradas cada 5 minutos automáticamente.',
  })
  @ApiOkResponse({
    description: 'Heartbeat actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o sesión no encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Sesión no encontrada',
  })
  async updateSessionHeartbeat(
    @Body() updateHeartbeatDto: UpdateSessionHeartbeatDto,
    @Req() request: ExpressRequest,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Obtener sessionId centralizado (body precede a cookie)
      const sessionId = resolveVisitorSessionId(
        request,
        updateHeartbeatDto.sessionId,
      );

      if (!sessionId) {
        throw new BadRequestException('SessionId no proporcionado');
      }

      const command = new UpdateSessionHeartbeatCommand(
        sessionId,
        updateHeartbeatDto.visitorId,
      );

      await this.commandBus.execute<UpdateSessionHeartbeatCommand, void>(
        command,
      );

      return {
        success: true,
        message: 'Heartbeat actualizado exitosamente',
      };
    } catch (error) {
      this.logger.error('Error al actualizar heartbeat:', error);

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
      throw new InternalServerErrorException(
        'Error interno al actualizar heartbeat',
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
}
