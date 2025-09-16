import {
  Controller,
  Post,
  Body,
  Response,
  HttpCode,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
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

@ApiTags('visitors')
@Controller('visitors')
export class VisitorV2Controller {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('identify')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Identificar visitante',
    description:
      'Registra o actualiza un visitante en el sistema. Si el fingerprint ya existe en el siteId, actualiza al visitante. Si no existe, crea un nuevo Visitor en estado inicial (anónimo). Inicia una nueva Session asociada al visitante y devuelve un identificador de sesión en cookie HttpOnly.',
  })
  @ApiOkResponse({
    description: 'Visitante identificado exitosamente',
    type: IdentifyVisitorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos proporcionados',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async identifyVisitor(
    @Body() identifyVisitorDto: IdentifyVisitorDto,
    @Response({ passthrough: true }) response: ExpressResponse,
  ): Promise<IdentifyVisitorResponseDto> {
    const command = new IdentifyVisitorCommand(
      identifyVisitorDto.fingerprint,
      identifyVisitorDto.siteId,
      identifyVisitorDto.tenantId,
      identifyVisitorDto.currentUrl,
    );

    const result = await this.commandBus.execute<
      IdentifyVisitorCommand,
      IdentifyVisitorResponseDto
    >(command);

    // Setear cookie HttpOnly con el sessionId
    response.cookie('sid', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
    });

    return result;
  }

  @Post('session/heartbeat')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Actualizar heartbeat de sesión',
    description:
      'Mantiene viva la sesión abierta. Actualiza el timestamp de última actividad (lastActivityAt). Mientras se reciban heartbeats, el visitante se considera online.',
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
    // Obtener sessionId de body o de cookie si no viene en body
    const sessionId =
      updateHeartbeatDto.sessionId ||
      (request.cookies && typeof request.cookies.sid === 'string'
        ? request.cookies.sid
        : undefined);

    if (!sessionId) {
      throw new BadRequestException('SessionId no proporcionado');
    }

    const command = new UpdateSessionHeartbeatCommand(
      sessionId,
      updateHeartbeatDto.visitorId,
    );

    await this.commandBus.execute<UpdateSessionHeartbeatCommand, void>(command);

    return {
      success: true,
      message: 'Heartbeat actualizado exitosamente',
    };
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
    // Obtener sessionId de body o de cookie si no viene en body
    const sessionId =
      endSessionDto.sessionId ||
      (request.cookies && typeof request.cookies.sid === 'string'
        ? request.cookies.sid
        : undefined);

    if (!sessionId) {
      throw new BadRequestException('SessionId no proporcionado');
    }

    const command = new EndSessionCommand(
      sessionId,
      endSessionDto.visitorId,
      endSessionDto.reason,
    );

    await this.commandBus.execute<EndSessionCommand, void>(command);

    // Limpiar cookie de sesión
    response.clearCookie('sid');

    return {
      success: true,
      message: 'Sesión cerrada exitosamente',
    };
  }
}
