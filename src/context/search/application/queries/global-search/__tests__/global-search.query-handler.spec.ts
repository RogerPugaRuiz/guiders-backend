import { Test } from '@nestjs/testing';
import { GlobalSearchQueryHandler } from '../global-search.query-handler';
import { GlobalSearchQuery } from '../global-search.query';
import {
  SEARCH_PROVIDER,
  SearchProvider,
  SearchResult,
  SearchResultPrimitives,
  SearchScope,
} from 'src/context/shared/domain/search';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { SearchCacheService } from '../../../../infrastructure/cache/search-cache.service';

/** Construye un SearchResult de prueba */
function buildResult(scope: SearchScope = SearchScope.CHATS): SearchResult {
  return SearchResult.create({
    id: Uuid.random().value,
    scope,
    title: `Resultado ${scope}`,
    subtitle: 'Subtítulo',
    url: `/path/${Uuid.random().value}`,
  });
}

/** Crea un mock de SearchProvider */
function mockProvider(
  scope: SearchScope[],
  results: SearchResult[] = [],
): jest.Mocked<SearchProvider> {
  return {
    scope,
    search: jest.fn().mockResolvedValue(results),
  };
}

/** Crea un mock de SearchCacheService con cache miss por defecto */
function mockCacheService(
  cachedValue: SearchResultPrimitives[] | null = null,
): jest.Mocked<SearchCacheService> {
  return {
    buildKey: jest.fn().mockReturnValue('search:test-key'),
    get: jest.fn().mockResolvedValue(cachedValue),
    set: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<SearchCacheService>;
}

describe('GlobalSearchQueryHandler', () => {
  const companyId = Uuid.random().value;

  async function buildHandler(
    providers: SearchProvider[],
    cache: jest.Mocked<SearchCacheService> = mockCacheService(),
  ): Promise<{
    handler: GlobalSearchQueryHandler;
    cache: jest.Mocked<SearchCacheService>;
  }> {
    const module = await Test.createTestingModule({
      providers: [
        GlobalSearchQueryHandler,
        {
          provide: SEARCH_PROVIDER,
          useValue: providers,
        },
        {
          provide: SearchCacheService,
          useValue: cache,
        },
      ],
    }).compile();
    return { handler: module.get(GlobalSearchQueryHandler), cache };
  }

  describe('filtrado por rol', () => {
    it('debe retornar [] cuando el rol es "visitor" (sin scopes permitidos)', async () => {
      const chatProvider = mockProvider([SearchScope.CHATS], [buildResult()]);
      const { handler } = await buildHandler([chatProvider]);

      const result = await handler.execute(
        new GlobalSearchQuery('test', companyId, ['visitor']),
      );

      expect(result).toEqual([]);
      expect(chatProvider.search).not.toHaveBeenCalled();
    });

    it('debe retornar [] cuando los roles no tienen scopes registrados', async () => {
      const { handler } = await buildHandler([
        mockProvider([SearchScope.CHATS], [buildResult()]),
      ]);

      const result = await handler.execute(
        new GlobalSearchQuery('test', companyId, ['unknown_role']),
      );

      expect(result).toEqual([]);
    });

    it('admin debe poder acceder a todos los providers', async () => {
      const chatProvider = mockProvider([SearchScope.CHATS], [buildResult()]);
      const companyProvider = mockProvider(
        [SearchScope.COMPANIES],
        [buildResult(SearchScope.COMPANIES)],
      );
      const { handler } = await buildHandler([chatProvider, companyProvider]);

      await handler.execute(
        new GlobalSearchQuery('test', companyId, ['admin']),
      );

      expect(chatProvider.search).toHaveBeenCalled();
      expect(companyProvider.search).toHaveBeenCalled();
    });

    it('supervisor NO debe acceder al provider de COMPANIES', async () => {
      const chatProvider = mockProvider([SearchScope.CHATS], []);
      const companyProvider = mockProvider([SearchScope.COMPANIES], []);
      const { handler } = await buildHandler([chatProvider, companyProvider]);

      await handler.execute(
        new GlobalSearchQuery('test', companyId, ['supervisor']),
      );

      expect(chatProvider.search).toHaveBeenCalled();
      expect(companyProvider.search).not.toHaveBeenCalled();
    });

    it('commercial NO debe acceder al provider de COMPANIES', async () => {
      const companyProvider = mockProvider([SearchScope.COMPANIES], []);
      const leadsProvider = mockProvider([SearchScope.LEADS], []);
      const { handler } = await buildHandler([companyProvider, leadsProvider]);

      await handler.execute(
        new GlobalSearchQuery('test', companyId, ['commercial']),
      );

      expect(companyProvider.search).not.toHaveBeenCalled();
      expect(leadsProvider.search).toHaveBeenCalled();
    });
  });

  describe('ejecución paralela y resultados', () => {
    it('debe ejecutar providers en paralelo y aplanar resultados', async () => {
      const r1 = buildResult(SearchScope.CHATS);
      const r2 = buildResult(SearchScope.LEADS);
      const chatProvider = mockProvider([SearchScope.CHATS], [r1]);
      const leadsProvider = mockProvider([SearchScope.LEADS], [r2]);
      const { handler } = await buildHandler([chatProvider, leadsProvider]);

      const results = await handler.execute(
        new GlobalSearchQuery('test', companyId, ['admin']),
      );

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id)).toEqual(
        expect.arrayContaining([r1.toPrimitives().id, r2.toPrimitives().id]),
      );
    });

    it('debe limitar el total a 25 resultados máximos', async () => {
      // Creamos un provider que devuelve 20 resultados
      const manyResults = Array.from({ length: 20 }, () =>
        buildResult(SearchScope.CHATS),
      );
      const anotherBatch = Array.from({ length: 10 }, () =>
        buildResult(SearchScope.LEADS),
      );

      const chatProvider = mockProvider([SearchScope.CHATS], manyResults);
      const leadsProvider = mockProvider([SearchScope.LEADS], anotherBatch);
      const { handler } = await buildHandler([chatProvider, leadsProvider]);

      const results = await handler.execute(
        new GlobalSearchQuery('test', companyId, ['admin']),
      );

      expect(results.length).toBeLessThanOrEqual(25);
    });

    it('debe pasar agentId al search de cada provider', async () => {
      const agentId = Uuid.random().value;
      const chatProvider = mockProvider([SearchScope.CHATS], []);
      const { handler } = await buildHandler([chatProvider]);

      await handler.execute(
        new GlobalSearchQuery('test', companyId, ['commercial'], agentId),
      );

      expect(chatProvider.search).toHaveBeenCalledWith(
        expect.objectContaining({ agentId }),
      );
    });

    it('debe pasar companyId y query al search de cada provider', async () => {
      const chatProvider = mockProvider([SearchScope.CHATS], []);
      const { handler } = await buildHandler([chatProvider]);

      await handler.execute(
        new GlobalSearchQuery('hola mundo', companyId, ['admin']),
      );

      expect(chatProvider.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'hola mundo', companyId }),
      );
    });

    it('debe retornar primitivos (no instancias de SearchResult)', async () => {
      const result = buildResult();
      const { handler } = await buildHandler([
        mockProvider([SearchScope.CHATS], [result]),
      ]);

      const results = await handler.execute(
        new GlobalSearchQuery('test', companyId, ['admin']),
      );

      expect(results[0]).not.toBeInstanceOf(SearchResult);
      expect(typeof results[0].id).toBe('string');
      expect(typeof results[0].scope).toBe('string');
    });
  });

  describe('resiliencia ante fallos de providers', () => {
    it('debe retornar resultados de providers sanos aunque uno falle', async () => {
      const goodResult = buildResult(SearchScope.LEADS);
      const failingProvider = mockProvider([SearchScope.CHATS], []);
      (failingProvider.search as jest.Mock).mockRejectedValue(
        new Error('MongoDB timeout'),
      );
      const goodProvider = mockProvider([SearchScope.LEADS], [goodResult]);

      const { handler } = await buildHandler([failingProvider, goodProvider]);

      const results = await handler.execute(
        new GlobalSearchQuery('test', companyId, ['admin']),
      );

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(goodResult.toPrimitives().id);
    });

    it('debe retornar [] cuando todos los providers fallan', async () => {
      const p1 = mockProvider([SearchScope.CHATS], []);
      (p1.search as jest.Mock).mockRejectedValue(new Error('fail'));
      const p2 = mockProvider([SearchScope.LEADS], []);
      (p2.search as jest.Mock).mockRejectedValue(new Error('fail'));

      const { handler } = await buildHandler([p1, p2]);

      const results = await handler.execute(
        new GlobalSearchQuery('test', companyId, ['admin']),
      );

      expect(results).toEqual([]);
    });
  });

  describe('limit personalizado', () => {
    it('debe pasar el limit al provider cuando se especifica', async () => {
      const chatProvider = mockProvider([SearchScope.CHATS], []);
      const { handler } = await buildHandler([chatProvider]);

      await handler.execute(
        new GlobalSearchQuery('test', companyId, ['admin'], undefined, 3),
      );

      expect(chatProvider.search).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 3 }),
      );
    });

    it('debe usar limit 5 por defecto cuando no se especifica', async () => {
      const chatProvider = mockProvider([SearchScope.CHATS], []);
      const { handler } = await buildHandler([chatProvider]);

      await handler.execute(
        new GlobalSearchQuery('test', companyId, ['admin']),
      );

      expect(chatProvider.search).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 }),
      );
    });
  });

  describe('caché Redis', () => {
    it('debe retornar resultados del caché sin llamar a los providers (cache hit)', async () => {
      const cachedResults: SearchResultPrimitives[] = [
        {
          id: Uuid.random().value,
          scope: SearchScope.CHATS,
          title: 'Resultado cacheado',
          subtitle: 'Sub',
          url: '/chats/123',
        },
      ];
      const cache = mockCacheService(cachedResults);
      const chatProvider = mockProvider([SearchScope.CHATS], [buildResult()]);
      const { handler } = await buildHandler([chatProvider], cache);

      const results = await handler.execute(
        new GlobalSearchQuery('test', companyId, ['admin']),
      );

      expect(results).toEqual(cachedResults);
      expect(chatProvider.search).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('debe guardar en caché tras consultar los providers (cache miss)', async () => {
      const result = buildResult(SearchScope.CHATS);
      const cache = mockCacheService(null);
      const chatProvider = mockProvider([SearchScope.CHATS], [result]);
      const { handler } = await buildHandler([chatProvider], cache);

      const results = await handler.execute(
        new GlobalSearchQuery('test', companyId, ['admin']),
      );

      expect(chatProvider.search).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalledWith(
        'search:test-key',
        expect.arrayContaining([
          expect.objectContaining({ id: result.toPrimitives().id }),
        ]),
      );
      expect(results).toHaveLength(1);
    });

    it('debe construir la clave de caché con los parámetros correctos', async () => {
      const agentId = Uuid.random().value;
      const cache = mockCacheService(null);
      const chatProvider = mockProvider([SearchScope.CHATS], []);
      const { handler } = await buildHandler([chatProvider], cache);

      await handler.execute(
        new GlobalSearchQuery('mi query', companyId, ['commercial'], agentId),
      );

      expect(cache.buildKey).toHaveBeenCalledWith({
        companyId,
        roles: ['commercial'],
        agentId,
        query: 'mi query',
      });
    });
  });
});
