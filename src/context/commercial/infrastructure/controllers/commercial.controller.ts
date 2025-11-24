import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  // UseGuards,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';

// Guards (comentados hasta implementar)
// import { WsAuthGuard } from '../../../shared/infrastructure/guards/ws-auth.guard';
// import { WsRolesGuard } from '../../../shared/infrastructure/guards/ws-roles.guard';
// import { Roles } from '../../../shared/infrastructure/decorators/roles.decorator';

// DTOs
import {
  ConnectCommercialDto,
  DisconnectCommercialDto,
  CheckCommercialAvailabilityDto,
  ChangeCommercialStatusDto,
  CommercialStatusEnum,
} from '../../application/dtos/commercial-request.dto';
import {
  CommercialConnectionStatusResponseDto,
  OnlineCommercialsResponseDto,
  CommercialOperationResponseDto,
  CommercialAvailabilityResponseDto,
} from '../../application/dtos/commercial-response.dto';

// Queries
import { GetCommercialConnectionStatusQuery } from '../../application/queries/get-commercial-connection-status.query';
import { GetAvailableCommercialsQuery } from '../../application/queries/get-available-commercials.query';
import { GetOnlineCommercialsQuery } from '../../application/queries/get-online-commercials.query';
import { GetCommercialAvailabilityBySiteQuery } from '../../application/queries/get-commercial-availability-by-site.query';

// Commands
import { ConnectCommercialCommand } from '../../application/commands/connect-commercial.command';
import { DisconnectCommercialCommand } from '../../application/commands/disconnect-commercial.command';
import { UpdateCommercialActivityCommand } from '../../application/commands/update-commercial-activity.command';
import { ChangeCommercialConnectionStatusCommand } from '../../application/commands/change-commercial-connection-status.command';

// Services
import {
  ValidateDomainApiKey,
  VALIDATE_DOMAIN_API_KEY,
} from '../../../auth/auth-visitor/application/services/validate-domain-api-key';
import {
  CompanyRepository,
  COMPANY_REPOSITORY,
} from '../../../company/domain/company.repository';
import { VisitorAccountApiKey } from '../../../auth/auth-visitor/domain/models/visitor-account-api-key';

/**
 * Controlador REST para el contexto Commercial
 * Gestiona endpoints para heartbeat y estado de comerciales
 */
@ApiTags('Commercials')
@ApiBearerAuth()
@Controller('v2/commercials')
// @UseGuards(WsAuthGuard, WsRolesGuard)
export class CommercialController {
  private readonly logger = new Logger(CommercialController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(VALIDATE_DOMAIN_API_KEY)
    private readonly apiKeyValidator: ValidateDomainApiKey,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
  ) {}

  /**
   * Conecta un comercial al sistema
   */
  @Post('connect')
  @HttpCode(HttpStatus.OK)
  // // @Roles(['commercial', 'admin'])
  @ApiOperation({
    summary: 'Conectar comercial',
    description: 'Registra un comercial como conectado en el sistema',
  })
  @ApiBody({ type: ConnectCommercialDto })
  @ApiResponse({
    status: 200,
    description: 'Comercial conectado exitosamente',
    type: CommercialOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async connectCommercial(
    @Body() connectDto: ConnectCommercialDto,
  ): Promise<CommercialOperationResponseDto> {
    try {
      this.logger.log(`Conectando comercial: ${connectDto.id}`);

      // Ejecutar comando para conectar comercial
      const command = new ConnectCommercialCommand(
        connectDto.id,
        connectDto.name,
        connectDto.metadata,
      );
      await this.commandBus.execute(command);

      return {
        success: true,
        message: 'Comercial conectado exitosamente',
        commercial: {
          id: connectDto.id,
          name: connectDto.name,
          connectionStatus: 'CONNECTED',
          lastActivity: new Date(),
          isActive: true,
        },
      };
    } catch (error: unknown) {
      this.logger.error(`Error al conectar comercial ${connectDto.id}:`, error);
      throw new InternalServerErrorException('Error al conectar comercial');
    }
  }

  /**
   * Desconecta un comercial del sistema
   */
  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  // @Roles(['commercial', 'admin'])
  @ApiOperation({
    summary: 'Desconectar comercial',
    description: 'Registra un comercial como desconectado del sistema',
  })
  @ApiBody({ type: DisconnectCommercialDto })
  @ApiResponse({
    status: 200,
    description: 'Comercial desconectado exitosamente',
    type: CommercialOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async disconnectCommercial(
    @Body() disconnectDto: DisconnectCommercialDto,
  ): Promise<CommercialOperationResponseDto> {
    try {
      this.logger.log(`Desconectando comercial: ${disconnectDto.id}`);

      // Ejecutar comando para desconectar comercial
      const command = new DisconnectCommercialCommand(disconnectDto.id);
      await this.commandBus.execute(command);

      return {
        success: true,
        message: 'Comercial desconectado exitosamente',
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error al desconectar comercial ${disconnectDto.id}:`,
        error,
      );
      throw new InternalServerErrorException('Error al desconectar comercial');
    }
  }

  /**
   * Cambia el estado de conexión de un comercial manualmente
   */
  @Put('status')
  @HttpCode(HttpStatus.OK)
  // @Roles(['commercial', 'admin'])
  @ApiOperation({
    summary: 'Cambiar estado de conexión del comercial',
    description:
      'Permite a un comercial cambiar manualmente su estado de conexión (online, busy, away, offline)',
  })
  @ApiBody({ type: ChangeCommercialStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Estado cambiado exitosamente',
    type: CommercialOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Comercial no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async changeCommercialStatus(
    @Body() changeStatusDto: ChangeCommercialStatusDto,
  ): Promise<CommercialOperationResponseDto> {
    try {
      this.logger.log(
        `Cambiando estado de comercial ${changeStatusDto.id} a ${changeStatusDto.status}`,
      );

      // Ejecutar comando para cambiar estado
      const command = new ChangeCommercialConnectionStatusCommand(
        changeStatusDto.id,
        changeStatusDto.status,
      );
      await this.commandBus.execute(command);

      return {
        success: true,
        message: `Estado cambiado a ${changeStatusDto.status} exitosamente`,
        commercial: {
          id: changeStatusDto.id,
          name: 'Commercial',
          connectionStatus: changeStatusDto.status.toUpperCase(),
          lastActivity: new Date(),
          isActive: changeStatusDto.status === CommercialStatusEnum.ONLINE,
        },
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error al cambiar estado del comercial ${changeStatusDto.id}:`,
        error,
      );

      if (error instanceof Error && error.message?.includes('no encontrado')) {
        throw new NotFoundException('Comercial no encontrado');
      }

      if (error instanceof Error && error.message?.includes('estado')) {
        throw new BadRequestException(error.message);
      }

      throw new InternalServerErrorException(
        'Error al cambiar estado del comercial',
      );
    }
  }

  /**
   * Obtiene el estado de conexión de un comercial
   */
  @Get(':id/status')
  // @Roles(['commercial', 'admin'])
  @ApiOperation({
    summary: 'Obtener estado de comercial',
    description:
      'Obtiene el estado de conexión actual de un comercial específico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del comercial',
    example: 'e7f8a9b0-1234-5678-9abc-def012345678',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado del comercial obtenido exitosamente',
    type: CommercialConnectionStatusResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Comercial no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async getCommercialStatus(
    @Param('id') commercialId: string,
  ): Promise<CommercialConnectionStatusResponseDto> {
    try {
      this.logger.log(`Obteniendo estado comercial: ${commercialId}`);

      const query = new GetCommercialConnectionStatusQuery(commercialId);
      const status = await this.queryBus.execute<
        GetCommercialConnectionStatusQuery,
        CommercialConnectionStatusResponseDto
      >(query);

      return status;
    } catch (error: unknown) {
      this.logger.error(
        `Error al obtener estado comercial ${commercialId}:`,
        error,
      );

      if (error instanceof Error && error.message?.includes('no encontrado')) {
        throw new NotFoundException('Comercial no encontrado');
      }

      throw new InternalServerErrorException(
        'Error al obtener estado comercial',
      );
    }
  }

  /**
   * Obtiene la lista de comerciales activos/online
   */
  @Get('active')
  // @Roles(['admin'])
  @ApiOperation({
    summary: 'Obtener comerciales activos',
    description:
      'Obtiene la lista de todos los comerciales que están actualmente online',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de comerciales activos obtenida exitosamente',
    type: OnlineCommercialsResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async getActiveCommercials(): Promise<OnlineCommercialsResponseDto> {
    try {
      this.logger.log('Obteniendo comerciales activos');

      const query = new GetOnlineCommercialsQuery();
      const result = await this.queryBus.execute<
        GetOnlineCommercialsQuery,
        OnlineCommercialsResponseDto
      >(query);

      return result;
    } catch (error: unknown) {
      this.logger.error('Error al obtener comerciales activos:', error);
      throw new InternalServerErrorException(
        'Error al obtener comerciales activos',
      );
    }
  }

  /**
   * Obtiene la lista de comerciales disponibles para asignación
   */
  @Get('available')
  // @Roles(['admin'])
  @ApiOperation({
    summary: 'Obtener comerciales disponibles',
    description:
      'Obtiene la lista de comerciales que están online y disponibles para atender chats',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de comerciales disponibles obtenida exitosamente',
    type: OnlineCommercialsResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async getAvailableCommercials(): Promise<OnlineCommercialsResponseDto> {
    try {
      this.logger.log('Obteniendo comerciales disponibles');

      const query = new GetAvailableCommercialsQuery();
      const result = await this.queryBus.execute<
        GetAvailableCommercialsQuery,
        OnlineCommercialsResponseDto
      >(query);

      return result;
    } catch (error: unknown) {
      this.logger.error('Error al obtener comerciales disponibles:', error);
      throw new InternalServerErrorException(
        'Error al obtener comerciales disponibles',
      );
    }
  }

  /**
   * Consulta disponibilidad de comerciales para un sitio (endpoint público)
   * Usa validación domain + apiKey, sin requerir autenticación previa
   */
  @Post('availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consultar disponibilidad de comerciales',
    description:
      'Endpoint público que permite a visitantes consultar si hay comerciales disponibles ' +
      'para atender antes de iniciar sesión. Valida el dominio y API Key del sitio.',
  })
  @ApiBody({ type: CheckCommercialAvailabilityDto })
  @ApiResponse({
    status: 200,
    description:
      'Disponibilidad consultada exitosamente (retorna disponibilidad incluso si no hay comerciales)',
    type: CommercialAvailabilityResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos (domain o apiKey faltantes)',
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
  async checkCommercialAvailability(
    @Body() dto: CheckCommercialAvailabilityDto,
  ): Promise<CommercialAvailabilityResponseDto> {
    try {
      this.logger.log(`Consultando disponibilidad para domain: ${dto.domain}`);

      // Normalizar dominio: eliminar prefijo 'www.' si existe
      const normalizedDomain = dto.domain.replace(/^www\./i, '');

      // 1. Validar API Key con dominio normalizado
      const apiKeyValid = await this.apiKeyValidator.validate({
        apiKey: new VisitorAccountApiKey(dto.apiKey),
        domain: normalizedDomain,
      });

      if (!apiKeyValid) {
        throw new UnauthorizedException(
          'API Key inválida para el dominio proporcionado',
        );
      }

      // 2. Resolver dominio a tenantId y siteId
      const companyResult =
        await this.companyRepository.findByDomain(normalizedDomain);

      if (companyResult.isErr()) {
        throw new NotFoundException(
          `No se encontró una empresa para el dominio: ${normalizedDomain}`,
        );
      }

      const company = companyResult.value;
      const sites = company.getSites();
      const sitePrimitives = sites.toPrimitives();

      const targetSite = sitePrimitives.find(
        (site) =>
          site.canonicalDomain === normalizedDomain ||
          site.domainAliases.includes(normalizedDomain),
      );

      if (!targetSite) {
        throw new NotFoundException(
          `No se encontró un sitio específico para el dominio: ${normalizedDomain}`,
        );
      }

      this.logger.log(
        `Sitio resuelto: ${targetSite.id} (domain: ${normalizedDomain})`,
      );

      // 3. Consultar disponibilidad de comerciales para el sitio
      const query = new GetCommercialAvailabilityBySiteQuery(targetSite.id);
      const result = await this.queryBus.execute<
        GetCommercialAvailabilityBySiteQuery,
        CommercialAvailabilityResponseDto
      >(query);

      return result;
    } catch (error: unknown) {
      this.logger.error(
        `Error al consultar disponibilidad para domain ${dto.domain}:`,
        error,
      );

      // Re-lanzar errores específicos
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Error genérico del servidor
      throw new InternalServerErrorException(
        'Error al consultar disponibilidad de comerciales',
      );
    }
  }

  /**
   * Elimina un comercial del sistema (admin only)
   */
  @Delete(':id')
  // @Roles(['admin'])
  @ApiOperation({
    summary: 'Eliminar comercial',
    description:
      'Elimina un comercial del sistema completamente (solo administradores)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del comercial',
    example: 'e7f8a9b0-1234-5678-9abc-def012345678',
  })
  @ApiResponse({
    status: 200,
    description: 'Comercial eliminado exitosamente',
    type: CommercialOperationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Comercial no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async removeCommercial(
    @Param('id') commercialId: string,
  ): Promise<CommercialOperationResponseDto> {
    try {
      this.logger.log(`Eliminando comercial: ${commercialId}`);

      // Por ahora, mock de la respuesta hasta implementar commands
      // TODO: Implementar RemoveCommercialCommand
      await Promise.resolve(); // Simular operación async

      return {
        success: true,
        message: 'Comercial eliminado exitosamente',
      };
    } catch (error: unknown) {
      this.logger.error(`Error al eliminar comercial ${commercialId}:`, error);

      if (error instanceof Error && error.message?.includes('no encontrado')) {
        throw new NotFoundException('Comercial no encontrado');
      }

      throw new InternalServerErrorException('Error al eliminar comercial');
    }
  }
}
