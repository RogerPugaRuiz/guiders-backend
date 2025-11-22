import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Logger,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { Request } from 'express';
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
import { SearchVisitorsQuery } from '../../application/queries/search-visitors.query';
import { GetQuickFiltersConfigQuery } from '../../application/queries/get-quick-filters-config.query';
import { GetSavedFiltersQuery } from '../../application/queries/get-saved-filters.query';
import { SaveFilterCommand } from '../../application/commands/save-filter.command';
import { DeleteSavedFilterCommand } from '../../application/commands/delete-saved-filter.command';
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
import {
  SearchVisitorsDto,
  VisitorFiltersDto,
  VisitorSortField,
  SortDirection,
} from '../../application/dtos/visitor-filters.dto';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { SearchVisitorsResponseDto } from '../../application/dtos/visitor-search-response.dto';
import { QuickFiltersConfigResponseDto } from '../../application/dtos/quick-filters.dto';
import {
  CreateSavedFilterDto,
  SavedFiltersListResponseDto,
} from '../../application/dtos/saved-filter.dto';

@ApiTags('Tenant Visitors Management')
@Controller('tenant-visitors')
@UseGuards(DualAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TenantVisitorsController {
  private readonly logger = new Logger(TenantVisitorsController.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

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
      `Obteniendo visitantes para tenant ${tenantId}, includeOffline: ${queryParams.includeOffline}, sortBy: ${queryParams.sortBy}, sortOrder: ${queryParams.sortOrder}`,
    );

    const query = GetVisitorsByTenantQuery.create({
      tenantId,
      includeOffline: queryParams.includeOffline,
      limit: queryParams.limit,
      offset: queryParams.offset,
      sortBy: queryParams.sortBy,
      sortOrder: queryParams.sortOrder,
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

  // ========== FILTROS COMPLEJOS ==========

  @Post(':tenantId/visitors/search')
  @Roles(['commercial', 'admin'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar visitantes con filtros complejos',
    description:
      'Permite buscar visitantes aplicando múltiples filtros, ordenamiento y paginación',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'ID único del tenant (empresa)',
  })
  @ApiResponse({
    status: 200,
    description: 'Búsqueda realizada exitosamente',
    type: SearchVisitorsResponseDto,
  })
  async searchVisitors(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() searchDto: SearchVisitorsDto,
  ): Promise<SearchVisitorsResponseDto> {
    this.logger.log(`Buscando visitantes con filtros para tenant ${tenantId}`);

    const filters = searchDto.filters || ({} as VisitorFiltersDto);
    const sort = searchDto.sort || {
      field: VisitorSortField.LAST_ACTIVITY,
      direction: SortDirection.DESC,
    };
    const pagination = {
      page: searchDto.page || 1,
      limit: searchDto.limit || 20,
    };

    const query = new SearchVisitorsQuery(tenantId, filters, sort, pagination);
    const result: Result<SearchVisitorsResponseDto, DomainError> =
      await this.queryBus.execute(query);

    if (result.isErr()) {
      throw result.error;
    }

    return result.unwrap();
  }

  @Get(':tenantId/visitors/filters/quick')
  @Roles(['commercial', 'admin'])
  @ApiOperation({
    summary: 'Obtener configuración de filtros rápidos',
    description:
      'Retorna la lista de filtros rápidos disponibles con sus contadores',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'ID único del tenant (empresa)',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración de filtros rápidos obtenida',
    type: QuickFiltersConfigResponseDto,
  })
  async getQuickFiltersConfig(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<QuickFiltersConfigResponseDto> {
    this.logger.log(
      `Obteniendo configuración de filtros rápidos para tenant ${tenantId}`,
    );

    const query = new GetQuickFiltersConfigQuery(tenantId);
    const result: Result<QuickFiltersConfigResponseDto, DomainError> =
      await this.queryBus.execute(query);

    if (result.isErr()) {
      throw result.error;
    }

    return result.unwrap();
  }

  @Get(':tenantId/visitors/filters/saved')
  @Roles(['commercial', 'admin'])
  @ApiOperation({
    summary: 'Obtener filtros guardados del usuario',
    description: 'Retorna la lista de filtros personalizados guardados',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'ID único del tenant (empresa)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de filtros guardados',
    type: SavedFiltersListResponseDto,
  })
  async getSavedFilters(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Req() request: Request,
  ): Promise<SavedFiltersListResponseDto> {
    const user = request.user as { id: string };
    this.logger.log(
      `Obteniendo filtros guardados para usuario ${user.id} en tenant ${tenantId}`,
    );

    const query = new GetSavedFiltersQuery(user.id, tenantId);
    const result: Result<SavedFiltersListResponseDto, DomainError> =
      await this.queryBus.execute(query);

    if (result.isErr()) {
      throw result.error;
    }

    return result.unwrap();
  }

  @Post(':tenantId/visitors/filters/saved')
  @Roles(['commercial', 'admin'])
  @ApiOperation({
    summary: 'Guardar un filtro personalizado',
    description: 'Guarda una configuración de filtros para uso posterior',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'ID único del tenant (empresa)',
  })
  @ApiResponse({
    status: 201,
    description: 'Filtro guardado exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID del filtro guardado' },
      },
    },
  })
  async saveFilter(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() createDto: CreateSavedFilterDto,
    @Req() request: Request,
  ): Promise<{ id: string }> {
    const user = request.user as { id: string };
    this.logger.log(
      `Guardando filtro "${createDto.name}" para usuario ${user.id}`,
    );

    const command = new SaveFilterCommand(
      user.id,
      tenantId,
      createDto.name,
      createDto.description,
      createDto.filters,
      createDto.sort,
    );

    const result = await this.commandBus.execute(command);

    if (result.isErr()) {
      throw result.error;
    }

    return { id: result.unwrap() };
  }

  @Delete(':tenantId/visitors/filters/saved/:filterId')
  @Roles(['commercial', 'admin'])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar un filtro guardado',
    description: 'Elimina un filtro personalizado previamente guardado',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'ID único del tenant (empresa)',
  })
  @ApiParam({
    name: 'filterId',
    description: 'ID del filtro a eliminar',
  })
  @ApiResponse({
    status: 204,
    description: 'Filtro eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Filtro no encontrado',
  })
  async deleteSavedFilter(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('filterId', ParseUUIDPipe) filterId: string,
    @Req() request: Request,
  ): Promise<void> {
    const user = request.user as { id: string };
    this.logger.log(`Eliminando filtro ${filterId} para usuario ${user.id}`);

    const command = new DeleteSavedFilterCommand(filterId, user.id, tenantId);
    const result = await this.commandBus.execute(command);

    if (result.isErr()) {
      throw result.error;
    }
  }
}
