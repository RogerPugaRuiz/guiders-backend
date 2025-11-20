import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Logger,
  ParseUUIDPipe,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DualAuthGuard } from '../../../shared/infrastructure/guards/dual-auth.guard';
import { RolesGuard } from '../../../shared/infrastructure/guards/role.guard';
import { Roles } from '../../../shared/infrastructure/roles.decorator';
import { GetVisitorsBySiteQuery } from '../../application/queries/get-visitors-by-site.query';
import { GetVisitorsWithUnassignedChatsBySiteQuery } from '../../application/queries/get-visitors-with-unassigned-chats-by-site.query';
import { GetVisitorsWithQueuedChatsBySiteQuery } from '../../application/queries/get-visitors-with-queued-chats-by-site.query';
import {
  SiteVisitorsResponseDto,
  SiteVisitorsUnassignedChatsResponseDto,
  SiteVisitorsQueuedChatsResponseDto,
} from '../../application/dtos/site-visitors-response.dto';
import {
  SiteVisitorsQueryDto,
  SiteVisitorsUnassignedChatsQueryDto,
  SiteVisitorsQueuedChatsQueryDto,
} from '../../application/dtos/site-visitors-query.dto';

@ApiTags('Site Visitors Management')
@Controller('site-visitors')
@UseGuards(DualAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SiteVisitorsController {
  private readonly logger = new Logger(SiteVisitorsController.name);

  constructor(private readonly queryBus: QueryBus) {}

  @Get(':siteId/visitors')
  @Roles(['commercial', 'admin'])
  @ApiOperation({
    summary: 'Obtener visitantes del sitio',
    description:
      'Retorna una lista de visitantes conectados o todos los visitantes del sitio especificado',
  })
  @ApiParam({
    name: 'siteId',
    description: 'ID único del sitio',
    example: 'site-uuid-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de visitantes obtenida exitosamente',
    type: SiteVisitorsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID de sitio inválido o parámetros de consulta inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Sitio no encontrado',
  })
  async getVisitorsBySite(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @Query() queryParams: SiteVisitorsQueryDto,
  ): Promise<SiteVisitorsResponseDto> {
    this.logger.log(
      `Obteniendo visitantes para sitio ${siteId}, includeOffline: ${queryParams.includeOffline}`,
    );

    const query = GetVisitorsBySiteQuery.create({
      siteId,
      includeOffline: queryParams.includeOffline,
      limit: queryParams.limit,
      offset: queryParams.offset,
    });

    return await this.queryBus.execute(query);
  }

  @Get(':siteId/visitors/unassigned-chats')
  @Roles(['commercial', 'admin'])
  @ApiOperation({
    summary: 'Obtener visitantes con chats sin asignar',
    description:
      'Retorna visitantes que tienen chats iniciados pero no asignados a ningún comercial',
  })
  @ApiParam({
    name: 'siteId',
    description: 'ID único del sitio',
    example: 'site-uuid-123',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de visitantes con chats sin asignar obtenida exitosamente',
    type: SiteVisitorsUnassignedChatsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID de sitio inválido o parámetros de consulta inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Sitio no encontrado',
  })
  async getVisitorsWithUnassignedChats(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @Query() queryParams: SiteVisitorsUnassignedChatsQueryDto,
  ): Promise<SiteVisitorsUnassignedChatsResponseDto> {
    this.logger.log(
      `Obteniendo visitantes con chats sin asignar para sitio ${siteId}`,
    );

    const query = GetVisitorsWithUnassignedChatsBySiteQuery.create({
      siteId,
      limit: queryParams.limit,
      offset: queryParams.offset,
    });

    return await this.queryBus.execute(query);
  }

  @Get(':siteId/visitors/queued-chats')
  @Roles(['commercial', 'admin'])
  @ApiOperation({
    summary: 'Obtener visitantes con chats en cola',
    description: 'Retorna visitantes que están en cola esperando ser atendidos',
  })
  @ApiParam({
    name: 'siteId',
    description: 'ID único del sitio',
    example: 'site-uuid-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de visitantes con chats en cola obtenida exitosamente',
    type: SiteVisitorsQueuedChatsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID de sitio inválido o parámetros de consulta inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Sitio no encontrado',
  })
  async getVisitorsWithQueuedChats(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @Query() queryParams: SiteVisitorsQueuedChatsQueryDto,
  ): Promise<SiteVisitorsQueuedChatsResponseDto> {
    this.logger.log(
      `Obteniendo visitantes con chats en cola para sitio ${siteId}`,
    );

    const query = GetVisitorsWithQueuedChatsBySiteQuery.create({
      siteId,
      limit: queryParams.limit,
      offset: queryParams.offset,
    });

    return await this.queryBus.execute(query);
  }
}
