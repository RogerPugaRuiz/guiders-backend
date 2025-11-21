import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { AuthGuard } from 'src/context/auth/auth-user/infrastructure/guard/auth.guard';
import { RoleGuard } from 'src/context/auth/auth-user/infrastructure/guard/role.guard';
import { Roles } from 'src/context/auth/auth-user/infrastructure/decorators/roles.decorator';
import {
  SearchSchemaResponseDto,
  SearchSuggestionsQueryDto,
  SearchSuggestionsResponseDto,
  VisitorSearchQueryDto,
  VisitorSearchResponseDto,
  SearchHistoryResponseDto,
  CreateSavedSearchDto,
  SavedSearchesResponseDto,
  DeleteSavedSearchParamsDto,
} from '../../application/dtos/visitor-search.dto';
import { GetVisitorSearchSchemaQuery } from '../../application/queries/get-visitor-search-schema.query';
import { GetVisitorSearchSuggestionsQuery } from '../../application/queries/get-visitor-search-suggestions.query';
import { ExecuteVisitorSearchQuery } from '../../application/queries/execute-visitor-search.query';
import { GetVisitorSearchHistoryQuery } from '../../application/queries/get-visitor-search-history.query';
import { GetVisitorSavedSearchesQuery } from '../../application/queries/get-visitor-saved-searches.query';
import { CreateSavedSearchCommand } from '../../application/commands/create-saved-search.command';
import { DeleteSavedSearchCommand } from '../../application/commands/delete-saved-search.command';

interface AuthenticatedRequest {
  user: {
    id: string;
    tenantId: string;
    roles: string[];
  };
}

@ApiTags('Visitor Search')
@Controller('visitors/search')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth()
export class VisitorSearchController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('schema')
  @Roles(['admin', 'commercial'])
  @ApiOperation({
    summary: 'Obtener esquema de campos filtrables',
    description:
      'Retorna los campos disponibles para filtrar visitantes con sus tipos y operadores soportados',
  })
  @ApiResponse({
    status: 200,
    description: 'Esquema de campos filtrables',
    type: SearchSchemaResponseDto,
  })
  async getSearchSchema(): Promise<SearchSchemaResponseDto> {
    return this.queryBus.execute(new GetVisitorSearchSchemaQuery());
  }

  @Get('suggestions')
  @Roles(['admin', 'commercial'])
  @ApiOperation({
    summary: 'Obtener sugerencias de autocompletado',
    description:
      'Retorna sugerencias contextuales basadas en la query parcial del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de sugerencias',
    type: SearchSuggestionsResponseDto,
  })
  async getSuggestions(
    @Query() query: SearchSuggestionsQueryDto,
  ): Promise<SearchSuggestionsResponseDto> {
    return this.queryBus.execute(
      new GetVisitorSearchSuggestionsQuery(query.q),
    );
  }

  @Get()
  @Roles(['admin', 'commercial'])
  @ApiOperation({
    summary: 'Ejecutar búsqueda de visitantes',
    description:
      'Ejecuta una búsqueda con sintaxis de filtros (ej: status:online lifecycle:LEAD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultados de la búsqueda',
    type: VisitorSearchResponseDto,
  })
  async executeSearch(
    @Query() query: VisitorSearchQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<VisitorSearchResponseDto> {
    return this.queryBus.execute(
      new ExecuteVisitorSearchQuery(
        req.user.tenantId,
        req.user.id,
        query.q,
        query.limit ?? 20,
        query.offset ?? 0,
        query.sortBy ?? 'updatedAt',
        query.sortOrder ?? 'desc',
      ),
    );
  }

  @Get('history')
  @Roles(['admin', 'commercial'])
  @ApiOperation({
    summary: 'Obtener historial de búsquedas',
    description: 'Retorna las búsquedas recientes del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de búsquedas',
    type: SearchHistoryResponseDto,
  })
  async getSearchHistory(
    @Req() req: AuthenticatedRequest,
  ): Promise<SearchHistoryResponseDto> {
    return this.queryBus.execute(
      new GetVisitorSearchHistoryQuery(req.user.tenantId, req.user.id),
    );
  }

  @Get('saved')
  @Roles(['admin', 'commercial'])
  @ApiOperation({
    summary: 'Obtener búsquedas guardadas',
    description: 'Retorna las búsquedas guardadas como favoritas por el usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Búsquedas guardadas',
    type: SavedSearchesResponseDto,
  })
  async getSavedSearches(
    @Req() req: AuthenticatedRequest,
  ): Promise<SavedSearchesResponseDto> {
    return this.queryBus.execute(
      new GetVisitorSavedSearchesQuery(req.user.tenantId, req.user.id),
    );
  }

  @Post('saved')
  @Roles(['admin', 'commercial'])
  @ApiOperation({
    summary: 'Guardar búsqueda como favorita',
    description: 'Guarda una query de búsqueda para uso posterior',
  })
  @ApiResponse({
    status: 201,
    description: 'Búsqueda guardada exitosamente',
  })
  async createSavedSearch(
    @Body() dto: CreateSavedSearchDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ id: string; message: string }> {
    const id = await this.commandBus.execute(
      new CreateSavedSearchCommand(
        req.user.tenantId,
        req.user.id,
        dto.query,
        dto.name,
      ),
    );
    return { id, message: 'Búsqueda guardada exitosamente' };
  }

  @Delete('saved/:id')
  @Roles(['admin', 'commercial'])
  @ApiOperation({
    summary: 'Eliminar búsqueda guardada',
    description: 'Elimina una búsqueda guardada por su ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Búsqueda eliminada exitosamente',
  })
  async deleteSavedSearch(
    @Param() params: DeleteSavedSearchParamsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.commandBus.execute(
      new DeleteSavedSearchCommand(req.user.tenantId, req.user.id, params.id),
    );
    return { message: 'Búsqueda eliminada exitosamente' };
  }
}
