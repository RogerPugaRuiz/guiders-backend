import {
  Controller,
  Post,
  Query,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { ResolveSiteCommand } from '../../application/commands/resolve-site.command';
import { ResolveSiteResponseDto } from '../../application/dtos/resolve-site-response.dto';

@ApiTags('sites')
@Controller('sites')
export class SitesController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('resolve')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Resolver sitio por host',
    description:
      'Resuelve el host actual del navegador (ejemplo: landing.mytech.com) y determina a qué site y tenant pertenece. El host es solo un alias que se mapea al modelo interno (siteId, tenantId) para trabajar con identidades estables.',
  })
  @ApiQuery({
    name: 'host',
    description: 'Host del navegador a resolver',
    example: 'landing.mytech.com',
    required: true,
  })
  @ApiOkResponse({
    description: 'Sitio resuelto exitosamente',
    type: ResolveSiteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Host no proporcionado o inválido',
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró un sitio para el host proporcionado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async resolveSite(
    @Query('host') host: string,
  ): Promise<ResolveSiteResponseDto> {
    if (!host) {
      throw new BadRequestException('El parámetro host es requerido');
    }

    const command = new ResolveSiteCommand(host);
    return await this.commandBus.execute<
      ResolveSiteCommand,
      ResolveSiteResponseDto
    >(command);
  }
}
