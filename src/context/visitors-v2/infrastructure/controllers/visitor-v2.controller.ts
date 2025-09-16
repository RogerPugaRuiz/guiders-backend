import { Controller, Post, Body, Response, HttpCode } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';
import { IdentifyVisitorDto } from '../../application/dtos/identify-visitor.dto';
import { IdentifyVisitorResponseDto } from '../../application/dtos/identify-visitor-response.dto';
import { IdentifyVisitorCommand } from '../../application/commands/identify-visitor.command';

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
}
