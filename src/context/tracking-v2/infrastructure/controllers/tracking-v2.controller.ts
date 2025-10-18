import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  HttpCode,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  IngestTrackingEventsBatchDto,
  IngestEventsResponseDto,
  EventStatsResponseDto,
} from '../../application/dtos';
import { IngestTrackingEventsCommand } from '../../application/commands';
import { GetEventStatsByTenantQuery } from '../../application/queries';

/**
 * Controller REST para tracking de eventos V2
 * Endpoints para ingesta de eventos y consultas de estadísticas
 */
@ApiTags('tracking-v2')
@Controller('tracking-v2')
export class TrackingV2Controller {
  private readonly logger = new Logger(TrackingV2Controller.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * POST /tracking-v2/events
   * Endpoint principal para ingesta de eventos en batch
   */
  @Post('events')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Ingerir eventos de tracking en batch',
    description:
      'Recibe un array de eventos de tracking y los procesa en batch. ' +
      'Aplica throttling (descarte de eventos de alta frecuencia), ' +
      'agregación (consolidación de eventos duplicados), y ' +
      'almacenamiento optimizado con particionamiento mensual. ' +
      'Máximo 500 eventos por request.',
  })
  @ApiBody({
    description:
      'Batch de eventos de tracking con tenantId, siteId y array de eventos',
    examples: {
      example1: {
        summary: 'Batch de eventos mixtos',
        description: 'Ejemplo con diferentes tipos de eventos',
        value: {
          tenantId: 'c3d4e5f6-a7b8-4c5d-9e0f-1a2b3c4d5e6f',
          siteId: 'd4e5f6a7-b8c9-4d5e-0f1a-2b3c4d5e6f7a',
          events: [
            {
              visitorId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
              sessionId: 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
              eventType: 'PAGE_VIEW',
              metadata: {
                url: '/products/laptop',
                title: 'Laptop Pro 2024',
                referrer: 'https://google.com',
              },
              occurredAt: '2024-01-15T10:30:00.000Z',
            },
            {
              visitorId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
              sessionId: 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
              eventType: 'CLICK',
              metadata: {
                element: 'button',
                id: 'add-to-cart',
                text: 'Añadir al carrito',
              },
              occurredAt: '2024-01-15T10:30:15.000Z',
            },
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Eventos procesados exitosamente',
    type: IngestEventsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos (campos faltantes, formato incorrecto, más de 500 eventos)',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno al procesar eventos',
  })
  async ingestEvents(
    @Body() dto: IngestTrackingEventsBatchDto,
  ): Promise<IngestEventsResponseDto> {
    try {
      this.logger.log(
        `Recibidos ${dto.events.length} eventos para tenant=${dto.tenantId}, site=${dto.siteId}`,
      );

      const command = new IngestTrackingEventsCommand(
        dto.tenantId,
        dto.siteId,
        dto.events,
      );

      const result = await this.commandBus.execute<
        IngestTrackingEventsCommand,
        IngestEventsResponseDto
      >(command);

      return result;
    } catch (error) {
      this.logger.error(
        `Error al ingestar eventos: ${error instanceof Error ? error.message : String(error)}`,
      );

      throw new BadRequestException(
        `Error al procesar eventos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
  }

  /**
   * GET /tracking-v2/stats/tenant/:tenantId
   * Obtiene estadísticas de eventos para un tenant
   */
  @Get('stats/tenant/:tenantId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Obtener estadísticas de eventos por tenant',
    description:
      'Retorna estadísticas agregadas de eventos para un tenant específico, ' +
      'incluyendo total de eventos, eventos por tipo, visitantes únicos y sesiones únicas. ' +
      'Opcionalmente puede filtrar por rango de fechas.',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Fecha de inicio (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Fecha de fin (ISO 8601)',
    example: '2024-01-31T23:59:59.999Z',
  })
  @ApiOkResponse({
    description: 'Estadísticas obtenidas exitosamente',
    type: EventStatsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'TenantId inválido o fechas mal formateadas',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno al obtener estadísticas',
  })
  async getStatsByTenant(
    @Param('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<EventStatsResponseDto> {
    try {
      this.logger.log(
        `Consultando estadísticas para tenant=${tenantId}, dateFrom=${dateFrom}, dateTo=${dateTo}`,
      );

      const query = new GetEventStatsByTenantQuery(
        tenantId,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined,
      );

      const result = await this.queryBus.execute<
        GetEventStatsByTenantQuery,
        EventStatsResponseDto
      >(query);

      return result;
    } catch (error) {
      this.logger.error(
        `Error al obtener estadísticas: ${error instanceof Error ? error.message : String(error)}`,
      );

      throw new BadRequestException(
        `Error al obtener estadísticas: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
  }

  /**
   * GET /tracking-v2/health
   * Health check del sistema de tracking
   */
  @Get('health')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Health check del sistema de tracking',
    description:
      'Verifica que el sistema de tracking esté funcionando correctamente',
  })
  @ApiOkResponse({
    description: 'Sistema funcionando correctamente',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
      },
    },
  })
  healthCheck(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
