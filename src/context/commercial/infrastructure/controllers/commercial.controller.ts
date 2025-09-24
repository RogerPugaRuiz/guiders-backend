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
  CommercialHeartbeatDto,
  DisconnectCommercialDto,
} from '../../application/dtos/commercial-request.dto';
import {
  CommercialConnectionStatusResponseDto,
  OnlineCommercialsResponseDto,
  CommercialOperationResponseDto,
} from '../../application/dtos/commercial-response.dto';

// Queries
import { GetCommercialConnectionStatusQuery } from '../../application/queries/get-commercial-connection-status.query';
import { GetAvailableCommercialsQuery } from '../../application/queries/get-available-commercials.query';
import { GetOnlineCommercialsQuery } from '../../application/queries/get-online-commercials.query';

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

      // Por ahora, mock de la respuesta hasta implementar commands
      // TODO: Implementar ConnectCommercialCommand
      await Promise.resolve(); // Simular operación async

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

      // Por ahora, mock de la respuesta hasta implementar commands
      // TODO: Implementar DisconnectCommercialCommand
      await Promise.resolve(); // Simular operación async

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
   * Actualiza la actividad de un comercial (heartbeat)
   */
  @Put('heartbeat')
  @HttpCode(HttpStatus.OK)
  // @Roles(['commercial', 'admin'])
  @ApiOperation({
    summary: 'Actualizar heartbeat comercial',
    description:
      'Actualiza la última actividad de un comercial para mantener la sesión activa',
  })
  @ApiBody({ type: CommercialHeartbeatDto })
  @ApiResponse({
    status: 200,
    description: 'Actividad actualizada exitosamente',
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
  async updateHeartbeat(
    @Body() heartbeatDto: CommercialHeartbeatDto,
  ): Promise<CommercialOperationResponseDto> {
    try {
      this.logger.log(`Actualizando heartbeat comercial: ${heartbeatDto.id}`);

      // Por ahora, mock de la respuesta hasta implementar commands
      // TODO: Implementar UpdateCommercialActivityCommand
      await Promise.resolve(); // Simular operación async

      return {
        success: true,
        message: 'Actividad actualizada exitosamente',
        commercial: {
          id: heartbeatDto.id,
          name: 'Mock Commercial',
          connectionStatus: 'CONNECTED',
          lastActivity: new Date(),
          isActive: true,
        },
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error al actualizar heartbeat comercial ${heartbeatDto.id}:`,
        error,
      );

      if (error instanceof Error && error.message?.includes('no encontrado')) {
        throw new NotFoundException('Comercial no encontrado');
      }

      throw new InternalServerErrorException(
        'Error al actualizar heartbeat comercial',
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
