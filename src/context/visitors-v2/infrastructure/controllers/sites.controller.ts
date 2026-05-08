import {
  Controller,
  Post,
  Query,
  HttpCode,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { DualAuthGuard } from '../../../shared/infrastructure/guards/dual-auth.guard';
import { RolesGuard } from '../../../shared/infrastructure/guards/role.guard';
import { Roles } from '../../../shared/infrastructure/roles.decorator';
import {
  ApiAuthErrors,
  ApiInternalServerError,
  ApiNotFoundError,
  ApiValidationError,
} from '../../../shared/infrastructure/swagger';
import { ResolveSiteCommand } from '../../application/commands/resolve-site.command';
import { ResolveSiteResponseDto } from '../../application/dtos/resolve-site-response.dto';

@ApiTags('sites')
@ApiAuthErrors()
@ApiInternalServerError()
@Controller('sites')
@UseGuards(DualAuthGuard, RolesGuard)
@Roles(['admin', 'commercial', 'supervisor'])
@ApiBearerAuth()
@ApiCookieAuth('access_token')
@ApiAuthErrors()
export class SitesController {
  private readonly logger = new Logger(SitesController.name);

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
  @ApiValidationError('Host no proporcionado o inválido')
  @ApiNotFoundError(
    'Sitio',
    'No se encontró un sitio para el host proporcionado',
  )
  async resolveSite(
    @Query('host') host: string,
  ): Promise<ResolveSiteResponseDto> {
    try {
      if (!host) {
        throw new BadRequestException('El parámetro host es requerido');
      }

      const command = new ResolveSiteCommand(host);
      return await this.commandBus.execute<
        ResolveSiteCommand,
        ResolveSiteResponseDto
      >(command);
    } catch (error) {
      this.logger.error(`Error al resolver sitio para host: ${host}`, error);

      // Host no encontrado
      if (error instanceof Error && error.message?.includes('No se encontró')) {
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
            : error.message || 'Host inválido',
        );
      }

      // Error genérico del servidor
      throw new InternalServerErrorException('Error interno al resolver sitio');
    }
  }
}
