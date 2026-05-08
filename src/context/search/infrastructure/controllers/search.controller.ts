import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GlobalSearchQuery } from '../../application/queries/global-search/global-search.query';
import { SearchResultPrimitives } from 'src/context/shared/domain/search';
import {
  ApiInternalServerError,
  ApiAuthErrors,
} from 'src/context/shared/infrastructure/swagger';
import { DualAuthGuard } from 'src/context/shared/infrastructure/guards/dual-auth.guard';
import { AuthenticatedRequest } from 'src/context/shared/infrastructure/guards/auth.guard';

/** Longitud mínima del término de búsqueda */
const MIN_QUERY_LENGTH = 2;

/** Longitud máxima del término de búsqueda */
const MAX_QUERY_LENGTH = 100;

@ApiTags('search')
@ApiBearerAuth()
@ApiInternalServerError()
@ApiAuthErrors()
@UseGuards(DualAuthGuard)
@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly queryBus: QueryBus) {}

  /**
   * GET /search?q=
   * Búsqueda global centralizada con filtrado por rol del usuario autenticado.
   * El rol del JWT determina qué providers ejecutan — el frontend no puede controlarlo.
   */
  @Get()
  @ApiOperation({
    summary: 'Búsqueda global',
    description:
      'Busca en todos los contextos accesibles según el rol del usuario autenticado. ' +
      'admin → chats, visitantes, leads, empresas, usuarios. ' +
      'supervisor/commercial → chats, visitantes, leads. ' +
      'visitor → sin resultados.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Término de búsqueda (mínimo 2 caracteres, máximo 100)',
    example: 'García',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description:
      'Número máximo de resultados por provider (default: 5, máx: 10)',
    example: 5,
  })
  @ApiOkResponse({
    description: 'Lista de resultados de búsqueda',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'a1b2c3d4-...' },
          scope: { type: 'string', example: 'chats' },
          title: { type: 'string', example: 'Chat con García' },
          subtitle: { type: 'string', example: 'Abierto · hace 2 horas' },
          url: { type: 'string', example: '/chats/a1b2c3d4' },
          metadata: { type: 'object' },
        },
      },
    },
  })
  async search(
    @Query('q') q: string,
    @Query('limit') limitStr: string | undefined,
    @Req() req: AuthenticatedRequest,
  ): Promise<SearchResultPrimitives[]> {
    // Validar parámetro q
    if (!q || q.trim().length < MIN_QUERY_LENGTH) {
      throw new BadRequestException(
        `El término de búsqueda debe tener al menos ${MIN_QUERY_LENGTH} caracteres`,
      );
    }

    if (q.trim().length > MAX_QUERY_LENGTH) {
      throw new BadRequestException(
        `El término de búsqueda no puede superar los ${MAX_QUERY_LENGTH} caracteres`,
      );
    }

    // Validar y parsear limit
    let limit: number | undefined;
    if (limitStr !== undefined) {
      const parsed = parseInt(limitStr, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 10) {
        throw new BadRequestException(
          'El parámetro limit debe ser un número entre 1 y 10',
        );
      }
      limit = parsed;
    }

    const user = req.user;
    const companyId = user?.companyId;

    if (!companyId) {
      throw new BadRequestException(
        'El usuario no tiene companyId en el token',
      );
    }

    this.logger.debug(
      `Búsqueda global: q="${q.trim()}" user=${user.id} roles=${user.roles.join(',')}`,
    );

    return this.queryBus.execute<GlobalSearchQuery, SearchResultPrimitives[]>(
      new GlobalSearchQuery(q.trim(), companyId, user.roles, user.id, limit),
    );
  }
}
