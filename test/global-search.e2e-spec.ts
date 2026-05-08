import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { CqrsModule } from '@nestjs/cqrs';

import { SearchController } from '../src/context/search/infrastructure/controllers/search.controller';
import { GlobalSearchQueryHandler } from '../src/context/search/application/queries/global-search/global-search.query-handler';
import {
  SEARCH_PROVIDER,
  SearchProvider,
  SearchResult,
  SearchScope,
} from '../src/context/shared/domain/search';
import { DualAuthGuard } from '../src/context/shared/infrastructure/guards/dual-auth.guard';
import { Uuid } from '../src/context/shared/domain/value-objects/uuid';

// ─── Mock del guard ─────────────────────────────────────────────────────────

/**
 * Reemplaza DualAuthGuard para todos los tests.
 * El user inyectado en req.user se configura por test via mockUser.
 */
let mockUser: {
  id: string;
  email: string;
  roles: string[];
  companyId: string;
} = {
  id: Uuid.random().value,
  email: 'admin@example.com',
  roles: ['admin'],
  companyId: Uuid.random().value,
};

class MockDualAuthGuard {
  canActivate(context: any): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = mockUser;
    return true;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeResult(
  overrides: Partial<ReturnType<SearchResult['toPrimitives']>> = {},
) {
  return SearchResult.create({
    id: Uuid.random().value,
    scope: SearchScope.CHATS,
    title: 'Chat de prueba',
    subtitle: 'Abierto',
    url: '/chats/123',
    ...overrides,
  });
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('SearchController (e2e)', () => {
  let app: INestApplication;

  // Provider mock compartido, se reconfigura por test
  const mockChatProvider: jest.Mocked<SearchProvider> = {
    scope: [SearchScope.CHATS],
    search: jest.fn(),
  };

  const mockVisitorProvider: jest.Mocked<SearchProvider> = {
    scope: [SearchScope.VISITORS],
    search: jest.fn(),
  };

  const mockLeadProvider: jest.Mocked<SearchProvider> = {
    scope: [SearchScope.LEADS],
    search: jest.fn(),
  };

  const mockCompanyProvider: jest.Mocked<SearchProvider> = {
    scope: [SearchScope.COMPANIES, SearchScope.USERS],
    search: jest.fn(),
  };

  const allMockProviders = [
    mockChatProvider,
    mockVisitorProvider,
    mockLeadProvider,
    mockCompanyProvider,
  ];

  beforeEach(async () => {
    // Limpiar historial de llamadas y resetear respuestas
    allMockProviders.forEach((p) => {
      (p.search as jest.Mock).mockClear();
      (p.search as jest.Mock).mockResolvedValue([]);
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [SearchController],
      providers: [
        GlobalSearchQueryHandler,
        {
          provide: SEARCH_PROVIDER,
          useValue: allMockProviders,
        },
      ],
    })
      .overrideGuard(DualAuthGuard)
      .useClass(MockDualAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // ─── Validaciones del parámetro q ─────────────────────────────────────────

  describe('Validación del parámetro q', () => {
    it('debe retornar 400 si q no se envía', async () => {
      await request(app.getHttpServer()).get('/search').expect(400);
    });

    it('debe retornar 400 si q tiene 1 carácter', async () => {
      await request(app.getHttpServer())
        .get('/search?q=a')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('2 caracteres');
        });
    });

    it('debe retornar 400 si q supera 100 caracteres', async () => {
      const longQuery = 'a'.repeat(101);
      await request(app.getHttpServer())
        .get(`/search?q=${longQuery}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('100');
        });
    });

    it('debe aceptar q con exactamente 2 caracteres', async () => {
      await request(app.getHttpServer()).get('/search?q=ab').expect(200);
    });

    it('debe aceptar q con exactamente 100 caracteres', async () => {
      const maxQuery = 'a'.repeat(100);
      await request(app.getHttpServer())
        .get(`/search?q=${maxQuery}`)
        .expect(200);
    });
  });

  // ─── Validaciones del parámetro limit ─────────────────────────────────────

  describe('Validación del parámetro limit', () => {
    it('debe retornar 400 si limit es 0', async () => {
      await request(app.getHttpServer())
        .get('/search?q=test&limit=0')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('limit');
        });
    });

    it('debe retornar 400 si limit es 11', async () => {
      await request(app.getHttpServer())
        .get('/search?q=test&limit=11')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('limit');
        });
    });

    it('debe retornar 400 si limit no es un número', async () => {
      await request(app.getHttpServer())
        .get('/search?q=test&limit=abc')
        .expect(400);
    });

    it('debe aceptar limit=1', async () => {
      await request(app.getHttpServer())
        .get('/search?q=test&limit=1')
        .expect(200);
    });

    it('debe aceptar limit=10', async () => {
      await request(app.getHttpServer())
        .get('/search?q=test&limit=10')
        .expect(200);
    });
  });

  // ─── Filtrado por rol ──────────────────────────────────────────────────────

  describe('Filtrado por rol del usuario', () => {
    it('admin debe recibir resultados de todos los providers', async () => {
      mockUser = {
        ...mockUser,
        roles: ['admin'],
        companyId: Uuid.random().value,
      };

      const chatResult = makeResult({
        scope: SearchScope.CHATS,
        title: 'Chat admin',
      });
      const companyResult = makeResult({
        scope: SearchScope.COMPANIES,
        title: 'Empresa admin',
      });

      mockChatProvider.search.mockResolvedValue([chatResult]);
      mockCompanyProvider.search.mockResolvedValue([companyResult]);

      const res = await request(app.getHttpServer())
        .get('/search?q=admin')
        .expect(200);

      const titles = res.body.map((r: { title: string }) => r.title);
      expect(titles).toContain('Chat admin');
      expect(titles).toContain('Empresa admin');
    });

    it('supervisor solo recibe resultados de chats, visitantes y leads', async () => {
      mockUser = {
        ...mockUser,
        roles: ['supervisor'],
        companyId: Uuid.random().value,
      };

      const chatResult = makeResult({
        scope: SearchScope.CHATS,
        title: 'Chat supervisor',
      });
      const companyResult = makeResult({
        scope: SearchScope.COMPANIES,
        title: 'Empresa supervisor',
      });

      mockChatProvider.search.mockResolvedValue([chatResult]);
      mockCompanyProvider.search.mockResolvedValue([companyResult]);

      const res = await request(app.getHttpServer())
        .get('/search?q=supervisor')
        .expect(200);

      const titles = res.body.map((r: { title: string }) => r.title);
      expect(titles).toContain('Chat supervisor');
      expect(titles).not.toContain('Empresa supervisor');
      // mockCompanyProvider NO debe haberse invocado
      expect(mockCompanyProvider.search).not.toHaveBeenCalled();
    });

    it('commercial solo recibe resultados de chats, visitantes y leads', async () => {
      mockUser = {
        ...mockUser,
        roles: ['commercial'],
        companyId: Uuid.random().value,
      };

      const chatResult = makeResult({
        scope: SearchScope.CHATS,
        title: 'Chat commercial',
      });
      mockChatProvider.search.mockResolvedValue([chatResult]);

      const res = await request(app.getHttpServer())
        .get('/search?q=comercial')
        .expect(200);

      const titles = res.body.map((r: { title: string }) => r.title);
      expect(titles).toContain('Chat commercial');
      expect(mockCompanyProvider.search).not.toHaveBeenCalled();
    });

    it('visitor recibe array vacío sin ejecutar ningún provider', async () => {
      mockUser = {
        ...mockUser,
        roles: ['visitor'],
        companyId: Uuid.random().value,
      };

      const res = await request(app.getHttpServer())
        .get('/search?q=visitor')
        .expect(200);

      expect(res.body).toEqual([]);
      allMockProviders.forEach((p) => {
        expect(p.search).not.toHaveBeenCalled();
      });
    });
  });

  // ─── Comportamiento del handler ────────────────────────────────────────────

  describe('Comportamiento del handler', () => {
    beforeEach(() => {
      mockUser = {
        id: Uuid.random().value,
        email: 'admin@example.com',
        roles: ['admin'],
        companyId: Uuid.random().value,
      };
    });

    it('debe retornar array vacío si todos los providers retornan []', async () => {
      const res = await request(app.getHttpServer())
        .get('/search?q=nada')
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('debe combinar resultados de múltiples providers', async () => {
      mockChatProvider.search.mockResolvedValue([
        makeResult({ scope: SearchScope.CHATS, title: 'Chat 1' }),
        makeResult({ scope: SearchScope.CHATS, title: 'Chat 2' }),
      ]);
      mockLeadProvider.search.mockResolvedValue([
        makeResult({ scope: SearchScope.LEADS, title: 'Lead 1' }),
      ]);

      const res = await request(app.getHttpServer())
        .get('/search?q=test')
        .expect(200);

      expect(res.body).toHaveLength(3);
      const titles = res.body.map((r: { title: string }) => r.title);
      expect(titles).toContain('Chat 1');
      expect(titles).toContain('Chat 2');
      expect(titles).toContain('Lead 1');
    });

    it('debe respetar el límite máximo de 25 resultados totales', async () => {
      // Cada provider retorna 10 resultados → 40 en total → se cortan a 25
      const makeResults = (scope: SearchScope, count: number) =>
        Array.from({ length: count }, (_, i) =>
          makeResult({ scope, title: `${scope} ${i}` }),
        );

      mockChatProvider.search.mockResolvedValue(
        makeResults(SearchScope.CHATS, 10),
      );
      mockVisitorProvider.search.mockResolvedValue(
        makeResults(SearchScope.VISITORS, 10),
      );
      mockLeadProvider.search.mockResolvedValue(
        makeResults(SearchScope.LEADS, 10),
      );
      mockCompanyProvider.search.mockResolvedValue(
        makeResults(SearchScope.COMPANIES, 10),
      );

      const res = await request(app.getHttpServer())
        .get('/search?q=muchos')
        .expect(200);

      expect(res.body.length).toBeLessThanOrEqual(25);
    });

    it('debe continuar si un provider falla (resiliencia)', async () => {
      mockChatProvider.search.mockRejectedValue(new Error('MongoDB timeout'));
      mockLeadProvider.search.mockResolvedValue([
        makeResult({ scope: SearchScope.LEADS, title: 'Lead resiliente' }),
      ]);

      const res = await request(app.getHttpServer())
        .get('/search?q=fallo')
        .expect(200);

      // Debe retornar los resultados del provider que SÍ funcionó
      const titles = res.body.map((r: { title: string }) => r.title);
      expect(titles).toContain('Lead resiliente');
    });

    it('debe pasar companyId del token a cada provider', async () => {
      const companyId = Uuid.random().value;
      mockUser = { ...mockUser, companyId };

      await request(app.getHttpServer()).get('/search?q=empresa').expect(200);

      // Verificar que todos los providers activos recibieron el companyId correcto
      expect(mockChatProvider.search).toHaveBeenCalledWith(
        expect.objectContaining({ companyId }),
      );
    });

    it('debe pasar el parámetro limit a los providers', async () => {
      await request(app.getHttpServer())
        .get('/search?q=test&limit=3')
        .expect(200);

      expect(mockChatProvider.search).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 3 }),
      );
    });

    it('debe usar limit=5 por defecto si no se especifica', async () => {
      await request(app.getHttpServer()).get('/search?q=test').expect(200);

      expect(mockChatProvider.search).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 }),
      );
    });

    it('debe retornar resultados en formato SearchResultPrimitives', async () => {
      const resultId = Uuid.random().value;
      mockChatProvider.search.mockResolvedValue([
        SearchResult.create({
          id: resultId,
          scope: SearchScope.CHATS,
          title: 'Chat García',
          subtitle: 'Abierto · hace 2 horas',
          url: `/chats/${resultId}`,
          metadata: { status: 'open' },
        }),
      ]);

      const res = await request(app.getHttpServer())
        .get('/search?q=García')
        .expect(200);

      expect(res.body[0]).toMatchObject({
        id: resultId,
        scope: SearchScope.CHATS,
        title: 'Chat García',
        subtitle: 'Abierto · hace 2 horas',
        url: `/chats/${resultId}`,
        metadata: { status: 'open' },
      });
    });
  });

  // ─── Autenticación ─────────────────────────────────────────────────────────

  describe('Autenticación', () => {
    it('debe retornar 400 si el usuario no tiene companyId', async () => {
      mockUser = { ...mockUser, companyId: '' };

      await request(app.getHttpServer())
        .get('/search?q=test')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('companyId');
        });
    });
  });
});
