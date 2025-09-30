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
import { GetVisitorsByTenantQuery } from '../../application/queries/get-visitors-by-tenant.query';
import { GetVisitorsWithUnassignedChatsByTenantQuery } from '../../application/queries/get-visitors-with-unassigned-chats-by-tenant.query';
import { GetVisitorsWithQueuedChatsByTenantQuery } from '../../application/queries/get-visitors-with-queued-chats-by-tenant.query';
import {
  TenantVisitorsResponseDto,
  TenantVisitorsUnassignedChatsResponseDto,
  TenantVisitorsQueuedChatsResponseDto,
} from '../../application/dtos/tenant-visitors-response.dto';
import {
  TenantVisitorsQueryDto,
  TenantVisitorsUnassignedChatsQueryDto,
  TenantVisitorsQueuedChatsQueryDto,
} from '../../application/dtos/tenant-visitors-query.dto';

@ApiTags('Tenant Visitors Management')
@Controller('tenant-visitors')
@UseGuards(DualAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TenantVisitorsController {
  private readonly logger = new Logger(TenantVisitorsController.name);

  constructor(private readonly queryBus: QueryBus) {}

  @Get(':tenantId/visitors')
  @Roles(['commercial', 'admin'])
  @ApiOperation({
    summary: 'Obtener visitantes del tenant (empresa)',
    description:
      'Retorna una lista de visitantes conectados o todos los visitantes de todos los sitios del tenant especificado',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'ID único del tenant (empresa)',
    example: 'tenant-uuid-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de visitantes obtenida exitosamente',
    type: TenantVisitorsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID de tenant inválido o parámetros de consulta inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant no encontrado',
  })
  async getVisitorsByTenant(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() queryParams: TenantVisitorsQueryDto,
  ): Promise<TenantVisitorsResponseDto> {
    this.logger.log(
      `Obteniendo visitantes para tenant ${tenantId}, includeOffline: ${queryParams.includeOffline}`,
    );

    const query = GetVisitorsByTenantQuery.create({
      tenantId,
      includeOffline: queryParams.includeOffline,
      limit: queryParams.limit,
      offset: queryParams.offset,
    });

    return await this.queryBus.execute(query);
  }

  @Get(':tenantId/visitors/unassigned-chats')
  @Roles(['commercial', 'admin'])
  @ApiOperation({
    summary: 'Obtener visitantes con chats sin asignar',
    description:
      'Retorna visitantes de todos los sitios del tenant que tienen chats iniciados pero no asignados a ningún comercial',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'ID único del tenant (empresa)',
    example: 'tenant-uuid-123',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de visitantes con chats sin asignar obtenida exitosamente',
    type: TenantVisitorsUnassignedChatsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID de tenant inválido o parámetros de consulta inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant no encontrado',
  })
  async getVisitorsWithUnassignedChats(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() queryParams: TenantVisitorsUnassignedChatsQueryDto,
  ): Promise<TenantVisitorsUnassignedChatsResponseDto> {
    this.logger.log(
      `Obteniendo visitantes con chats sin asignar para tenant ${tenantId}`,
    );

    const query = GetVisitorsWithUnassignedChatsByTenantQuery.create({
      tenantId,
      limit: queryParams.limit,
      offset: queryParams.offset,
    });

    return await this.queryBus.execute(query);
  }

  @Get(':tenantId/visitors/queued-chats')
  @Roles(['commercial', 'admin'])
  @ApiOperation({
    summary: 'Obtener visitantes con chats en cola',
    description:
      'Retorna visitantes de todos los sitios del tenant que están en cola esperando ser atendidos',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'ID único del tenant (empresa)',
    example: 'tenant-uuid-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de visitantes con chats en cola obtenida exitosamente',
    type: TenantVisitorsQueuedChatsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID de tenant inválido o parámetros de consulta inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant no encontrado',
  })
  async getVisitorsWithQueuedChats(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() queryParams: TenantVisitorsQueuedChatsQueryDto,
  ): Promise<TenantVisitorsQueuedChatsResponseDto> {
    this.logger.log(
      `Obteniendo visitantes con chats en cola para tenant ${tenantId}`,
    );

    const query = GetVisitorsWithQueuedChatsByTenantQuery.create({
      tenantId,
      limit: queryParams.limit,
      offset: queryParams.offset,
    });

    return await this.queryBus.execute(query);
  }
}
