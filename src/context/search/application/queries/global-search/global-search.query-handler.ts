import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GlobalSearchQuery } from './global-search.query';
import {
  SEARCH_PROVIDER,
  SearchProvider,
  SearchResultPrimitives,
} from 'src/context/shared/domain/search';
import { getScopesForRoles } from './role-scopes';
import { SearchCacheService } from '../../../infrastructure/cache/search-cache.service';

/** Número máximo de resultados totales permitidos */
const MAX_TOTAL_RESULTS = 25;

/** Número máximo de resultados por provider */
const DEFAULT_LIMIT_PER_PROVIDER = 5;

@QueryHandler(GlobalSearchQuery)
export class GlobalSearchQueryHandler
  implements IQueryHandler<GlobalSearchQuery>
{
  private readonly logger = new Logger(GlobalSearchQueryHandler.name);

  constructor(
    @Inject(SEARCH_PROVIDER)
    private readonly providers: SearchProvider[],
    private readonly cacheService: SearchCacheService,
  ) {}

  async execute(query: GlobalSearchQuery): Promise<SearchResultPrimitives[]> {
    this.logger.debug(
      `Búsqueda global: "${query.query}" para companyId=${query.companyId}, roles=${query.roles.join(',')}`,
    );

    // Intentar servir desde caché antes de consultar los providers
    const cacheKey = this.cacheService.buildKey({
      companyId: query.companyId,
      roles: query.roles,
      agentId: query.agentId,
      query: query.query,
    });
    const cached = await this.cacheService.get(cacheKey);
    if (cached !== null) {
      this.logger.debug(`Cache hit para key=${cacheKey}`);
      return cached;
    }

    // Determinar scopes permitidos para los roles del usuario
    const allowedScopes = getScopesForRoles(query.roles);

    if (allowedScopes.length === 0) {
      this.logger.debug(
        'Sin scopes permitidos para estos roles, retornando []',
      );
      return [];
    }
    // Filtrar providers que cubren al menos un scope permitido
    const activeProviders = this.providers.filter((p) =>
      p.scope.some((s) => allowedScopes.includes(s)),
    );

    if (activeProviders.length === 0) {
      return [];
    }

    const limit = query.limit ?? DEFAULT_LIMIT_PER_PROVIDER;

    // Ejecutar todos los providers en paralelo (cada uno gestiona sus propios errores)
    const results = await Promise.all(
      activeProviders.map((provider) =>
        provider
          .search({
            query: query.query,
            companyId: query.companyId,
            agentId: query.agentId,
            limit,
          })
          .catch((err) => {
            this.logger.warn(
              `Provider ${provider.constructor.name} falló: ${err?.message}`,
            );
            return [];
          }),
      ),
    );

    // Aplanar, mapear a primitivos y limitar total
    const flat = results
      .flat()
      .slice(0, MAX_TOTAL_RESULTS)
      .map((r) => r.toPrimitives());

    this.logger.debug(`Búsqueda global retornó ${flat.length} resultados`);

    // Guardar en caché para consultas futuras idénticas
    await this.cacheService.set(cacheKey, flat);

    return flat;
  }
}
