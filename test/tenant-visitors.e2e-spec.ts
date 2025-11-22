import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { CqrsModule, QueryBus, CommandBus } from '@nestjs/cqrs';
import { ok, err } from '../src/context/shared/domain/result';
import { SavedFilterLimitExceededError } from '../src/context/visitors-v2/domain/errors/saved-filter.error';
import * as request from 'supertest';
import { TenantVisitorsController } from '../src/context/visitors-v2/infrastructure/controllers/tenant-visitors.controller';
import { AuthGuard } from '../src/context/shared/infrastructure/guards/auth.guard';
import { RolesGuard } from '../src/context/shared/infrastructure/guards/role.guard';
import { DualAuthGuard } from '../src/context/shared/infrastructure/guards/dual-auth.guard';

// Tipos mock para evitar importar tipos reales
interface MockRequest {
  headers: { authorization?: string };
  user?: {
    id: string;
    sub: string;
    roles: string[];
    username: string;
    email: string;
  };
}

// Mock Guards
class MockAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MockRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token requerido');
    }

    // Determinar rol basado en el token
    let roles = ['commercial'];
    if (authHeader.includes('visitor-token')) {
      roles = ['visitor'];
    } else if (authHeader.includes('admin-token')) {
      roles = ['admin'];
    } else if (authHeader.includes('supervisor-token')) {
      roles = ['supervisor'];
    }

    request.user = {
      id: 'test-user-id',
      sub: 'test-user-sub',
      roles,
      username: 'test-user',
      email: 'test@example.com',
    };

    return true;
  }
}

class MockRolesGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MockRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Forbidden');
    }

    // Para simplificar, permitimos todos los roles en este mock
    return true;
  }
}

describe('TenantVisitorsController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let queryBusMock: jest.Mocked<QueryBus>;
  let commandBusMock: jest.Mocked<CommandBus>;

  const validTenantId = '123e4567-e89b-12d3-a456-426614174000';
  const invalidTenantId = 'invalid-uuid';

  // Helper para crear requests autenticados
  const authenticatedRequest = (path: string) => {
    return request(app.getHttpServer())
      .get(path)
      .set('Authorization', 'Bearer commercial-token');
  };

  // Mock visitor data con diferentes timestamps
  const createMockVisitor = (id: string, createdAt: Date, updatedAt: Date) => ({
    id,
    fingerprint: `fp-${id}`,
    connectionStatus: 'ONLINE',
    siteId: 'site-1',
    siteName: 'Test Site',
    currentUrl: 'https://example.com',
    userAgent: 'Mozilla/5.0',
    createdAt: createdAt.toISOString(),
    lastActivity: updatedAt.toISOString(),
    pendingChatIds: [],
    totalChatsCount: 0,
  });

  beforeAll(async () => {
    // Mock del QueryBus
    queryBusMock = {
      execute: jest.fn(),
    } as any;

    // Mock del CommandBus
    commandBusMock = {
      execute: jest.fn(),
    } as any;

    moduleFixture = await Test.createTestingModule({
      controllers: [TenantVisitorsController],
      imports: [CqrsModule],
      providers: [
        {
          provide: QueryBus,
          useValue: queryBusMock,
        },
        {
          provide: CommandBus,
          useValue: commandBusMock,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(DualAuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /tenant-visitors/:tenantId/visitors', () => {
    describe('Validación de parámetros', () => {
      it('debe rechazar tenantId inválido', async () => {
        const response = await authenticatedRequest(
          `/tenant-visitors/${invalidTenantId}/visitors`,
        );

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Validation failed');
      });

      // Nota: No hay validación @Max en el DTO actual, así que limit>100 es aceptado
      // Si se requiere, agregar @Max(100) al campo limit en TenantVisitorsQueryDto

      it('debe rechazar limit negativo', async () => {
        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors?limit=-1`,
        );

        expect(response.status).toBe(400);
      });

      it('debe rechazar offset negativo', async () => {
        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors?offset=-5`,
        );

        expect(response.status).toBe(400);
      });

      it('debe rechazar sortBy inválido', async () => {
        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors?sortBy=invalid`,
        );

        expect(response.status).toBe(400);
        expect(response.body.message).toEqual(
          expect.arrayContaining([
            expect.stringContaining('El campo de ordenamiento debe ser'),
          ]),
        );
      });

      it('debe rechazar sortOrder inválido', async () => {
        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors?sortOrder=invalid`,
        );

        expect(response.status).toBe(400);
        expect(response.body.message).toEqual(
          expect.arrayContaining([
            expect.stringContaining('El orden debe ser'),
          ]),
        );
      });

      it('debe aceptar valores válidos de sortBy', async () => {
        queryBusMock.execute.mockResolvedValue({
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [],
          totalCount: 0,
          activeSitesCount: 0,
          timestamp: new Date(),
        });

        const validSortByValues = ['lastActivity', 'createdAt'];

        for (const sortBy of validSortByValues) {
          const response = await authenticatedRequest(
            `/tenant-visitors/${validTenantId}/visitors?sortBy=${sortBy}`,
          );

          expect(response.status).toBe(200);
        }
      });

      it('debe aceptar valores válidos de sortOrder', async () => {
        queryBusMock.execute.mockResolvedValue({
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [],
          totalCount: 0,
          activeSitesCount: 0,
          timestamp: new Date(),
        });

        const validSortOrderValues = ['asc', 'desc'];

        for (const sortOrder of validSortOrderValues) {
          const response = await authenticatedRequest(
            `/tenant-visitors/${validTenantId}/visitors?sortOrder=${sortOrder}`,
          );

          expect(response.status).toBe(200);
        }
      });
    });

    describe('Paginación básica', () => {
      it('debe retornar visitantes con valores por defecto', async () => {
        const mockResponse = {
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [
            createMockVisitor('visitor-1', new Date(), new Date()),
            createMockVisitor('visitor-2', new Date(), new Date()),
          ],
          totalCount: 2,
          activeSitesCount: 1,
          timestamp: new Date(),
        };

        queryBusMock.execute.mockResolvedValue(mockResponse);

        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors`,
        );

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: expect.any(Array),
          totalCount: 2,
          activeSitesCount: 1,
        });
        expect(response.body.visitors).toHaveLength(2);
      });

      it('debe aplicar limit correctamente', async () => {
        const visitors = Array.from({ length: 10 }, (_, i) =>
          createMockVisitor(`visitor-${i}`, new Date(), new Date()),
        );

        queryBusMock.execute.mockResolvedValue({
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: visitors.slice(0, 5),
          totalCount: 100,
          activeSitesCount: 3,
          timestamp: new Date(),
        });

        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors?limit=5`,
        );

        expect(response.status).toBe(200);
        expect(response.body.visitors).toHaveLength(5);
        expect(response.body.totalCount).toBe(100);
        expect(queryBusMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 5,
          }),
        );
      });

      it('debe aplicar offset correctamente', async () => {
        const mockResponse = {
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [createMockVisitor('visitor-11', new Date(), new Date())],
          totalCount: 50,
          activeSitesCount: 2,
          timestamp: new Date(),
        };

        queryBusMock.execute.mockResolvedValue(mockResponse);

        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors?limit=10&offset=10`,
        );

        expect(response.status).toBe(200);
        expect(queryBusMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 10,
            offset: 10,
          }),
        );
      });

      it('debe manejar páginas vacías correctamente', async () => {
        queryBusMock.execute.mockResolvedValue({
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [],
          totalCount: 0,
          activeSitesCount: 0,
          timestamp: new Date(),
        });

        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors?offset=1000`,
        );

        expect(response.status).toBe(200);
        expect(response.body.visitors).toHaveLength(0);
        expect(response.body.totalCount).toBe(0);
      });
    });

    describe('Filtro includeOffline', () => {
      it('debe aplicar includeOffline=true', async () => {
        const mockResponse = {
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [
            {
              ...createMockVisitor('visitor-1', new Date(), new Date()),
              connectionStatus: 'ONLINE',
            },
            {
              ...createMockVisitor('visitor-2', new Date(), new Date()),
              connectionStatus: 'OFFLINE',
            },
          ],
          totalCount: 2,
          activeSitesCount: 1,
          timestamp: new Date(),
        };

        queryBusMock.execute.mockResolvedValue(mockResponse);

        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors?includeOffline=true`,
        );

        expect(response.status).toBe(200);
        expect(response.body.visitors).toHaveLength(2);
        expect(queryBusMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            includeOffline: true,
          }),
        );
      });

      it('debe aplicar includeOffline=false por defecto', async () => {
        const mockResponse = {
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [
            {
              ...createMockVisitor('visitor-1', new Date(), new Date()),
              connectionStatus: 'ONLINE',
            },
          ],
          totalCount: 1,
          activeSitesCount: 1,
          timestamp: new Date(),
        };

        queryBusMock.execute.mockResolvedValue(mockResponse);

        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors`,
        );

        expect(response.status).toBe(200);
        expect(queryBusMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            includeOffline: false,
          }),
        );
      });
    });

    describe('Ordenamiento por lastActivity', () => {
      it('debe ordenar por lastActivity desc (más recientes primero) por defecto', async () => {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 3600000);
        const twoHoursAgo = new Date(now.getTime() - 7200000);

        const mockResponse = {
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [
            createMockVisitor('visitor-1', twoHoursAgo, now), // Más reciente
            createMockVisitor('visitor-2', twoHoursAgo, oneHourAgo),
            createMockVisitor('visitor-3', twoHoursAgo, twoHoursAgo), // Menos reciente
          ],
          totalCount: 3,
          activeSitesCount: 1,
          timestamp: new Date(),
        };

        queryBusMock.execute.mockResolvedValue(mockResponse);

        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors?sortBy=lastActivity&sortOrder=desc`,
        );

        expect(response.status).toBe(200);
        expect(queryBusMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'lastActivity',
            sortOrder: 'desc',
          }),
        );

        // Verificar orden
        const visitors = response.body.visitors;
        expect(visitors[0].id).toBe('visitor-1');
        expect(visitors[2].id).toBe('visitor-3');
      });

      it('debe ordenar por lastActivity asc (menos recientes primero)', async () => {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 3600000);
        const twoHoursAgo = new Date(now.getTime() - 7200000);

        const mockResponse = {
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [
            createMockVisitor('visitor-3', twoHoursAgo, twoHoursAgo), // Menos reciente
            createMockVisitor('visitor-2', twoHoursAgo, oneHourAgo),
            createMockVisitor('visitor-1', twoHoursAgo, now), // Más reciente
          ],
          totalCount: 3,
          activeSitesCount: 1,
          timestamp: new Date(),
        };

        queryBusMock.execute.mockResolvedValue(mockResponse);

        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors?sortBy=lastActivity&sortOrder=asc`,
        );

        expect(response.status).toBe(200);
        expect(queryBusMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'lastActivity',
            sortOrder: 'asc',
          }),
        );

        // Verificar orden inverso
        const visitors = response.body.visitors;
        expect(visitors[0].id).toBe('visitor-3');
        expect(visitors[2].id).toBe('visitor-1');
      });
    });

    describe('Ordenamiento por createdAt', () => {
      it('debe ordenar por createdAt desc (más recientes primero)', async () => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 86400000);
        const twoDaysAgo = new Date(now.getTime() - 172800000);

        const mockResponse = {
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [
            createMockVisitor('visitor-1', now, now), // Creado hoy
            createMockVisitor('visitor-2', yesterday, yesterday), // Creado ayer
            createMockVisitor('visitor-3', twoDaysAgo, twoDaysAgo), // Creado hace 2 días
          ],
          totalCount: 3,
          activeSitesCount: 1,
          timestamp: new Date(),
        };

        queryBusMock.execute.mockResolvedValue(mockResponse);

        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors?sortBy=createdAt&sortOrder=desc`,
        );

        expect(response.status).toBe(200);
        expect(queryBusMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'createdAt',
            sortOrder: 'desc',
          }),
        );

        const visitors = response.body.visitors;
        expect(visitors[0].id).toBe('visitor-1');
        expect(visitors[2].id).toBe('visitor-3');
      });

      it('debe ordenar por createdAt asc (más antiguos primero)', async () => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 86400000);
        const twoDaysAgo = new Date(now.getTime() - 172800000);

        const mockResponse = {
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [
            createMockVisitor('visitor-3', twoDaysAgo, twoDaysAgo), // Más antiguo
            createMockVisitor('visitor-2', yesterday, yesterday),
            createMockVisitor('visitor-1', now, now), // Más reciente
          ],
          totalCount: 3,
          activeSitesCount: 1,
          timestamp: new Date(),
        };

        queryBusMock.execute.mockResolvedValue(mockResponse);

        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors?sortBy=createdAt&sortOrder=asc`,
        );

        expect(response.status).toBe(200);
        expect(queryBusMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'createdAt',
            sortOrder: 'asc',
          }),
        );

        const visitors = response.body.visitors;
        expect(visitors[0].id).toBe('visitor-3');
        expect(visitors[2].id).toBe('visitor-1');
      });
    });

    describe('Ordenamiento por connectionStatus', () => {
      it('debe ordenar por connectionStatus desc (online primero)', async () => {
        const mockResponse = {
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [
            {
              ...createMockVisitor('visitor-1', new Date(), new Date()),
              connectionStatus: 'ONLINE',
            },
            {
              ...createMockVisitor('visitor-2', new Date(), new Date()),
              connectionStatus: 'ONLINE',
            },
            {
              ...createMockVisitor('visitor-3', new Date(), new Date()),
              connectionStatus: 'OFFLINE',
            },
          ],
          totalCount: 3,
          activeSitesCount: 1,
          timestamp: new Date(),
        };

        queryBusMock.execute.mockResolvedValue(mockResponse);

        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors?sortBy=connectionStatus&sortOrder=desc&includeOffline=true`,
        );

        expect(response.status).toBe(200);
        expect(queryBusMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'connectionStatus',
            sortOrder: 'desc',
          }),
        );

        // Verificar que online viene primero
        const visitors = response.body.visitors;
        expect(visitors[0].connectionStatus).toBe('ONLINE');
        expect(visitors[1].connectionStatus).toBe('ONLINE');
        expect(visitors[2].connectionStatus).toBe('OFFLINE');
      });

      it('debe ordenar por connectionStatus asc (offline primero)', async () => {
        const mockResponse = {
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [
            {
              ...createMockVisitor('visitor-3', new Date(), new Date()),
              connectionStatus: 'OFFLINE',
            },
            {
              ...createMockVisitor('visitor-1', new Date(), new Date()),
              connectionStatus: 'ONLINE',
            },
            {
              ...createMockVisitor('visitor-2', new Date(), new Date()),
              connectionStatus: 'ONLINE',
            },
          ],
          totalCount: 3,
          activeSitesCount: 1,
          timestamp: new Date(),
        };

        queryBusMock.execute.mockResolvedValue(mockResponse);

        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors?sortBy=connectionStatus&sortOrder=asc&includeOffline=true`,
        );

        expect(response.status).toBe(200);
        expect(queryBusMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'connectionStatus',
            sortOrder: 'asc',
          }),
        );

        // Verificar que offline viene primero
        const visitors = response.body.visitors;
        expect(visitors[0].connectionStatus).toBe('OFFLINE');
        expect(visitors[1].connectionStatus).toBe('ONLINE');
        expect(visitors[2].connectionStatus).toBe('ONLINE');
      });
    });

    describe('Combinaciones de parámetros', () => {
      it('debe combinar paginación, filtros y ordenamiento', async () => {
        const mockResponse = {
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [
            createMockVisitor('visitor-1', new Date(), new Date()),
            createMockVisitor('visitor-2', new Date(), new Date()),
          ],
          totalCount: 100,
          activeSitesCount: 5,
          timestamp: new Date(),
        };

        queryBusMock.execute.mockResolvedValue(mockResponse);

        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors?limit=20&offset=40&includeOffline=true&sortBy=lastActivity&sortOrder=desc`,
        );

        expect(response.status).toBe(200);
        expect(queryBusMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: validTenantId,
            includeOffline: true,
            limit: 20,
            offset: 40,
            sortBy: 'lastActivity',
            sortOrder: 'desc',
          }),
        );
      });

      it('debe usar valores por defecto cuando no se especifican', async () => {
        queryBusMock.execute.mockResolvedValue({
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [],
          totalCount: 0,
          activeSitesCount: 0,
          timestamp: new Date(),
        });

        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors`,
        );

        expect(response.status).toBe(200);
        expect(queryBusMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: validTenantId,
            includeOffline: false,
            limit: 50, // Default
            offset: 0, // Default
            sortBy: 'lastActivity', // Default
            sortOrder: 'desc', // Default
          }),
        );
      });
    });

    describe('Estructura de respuesta', () => {
      it('debe incluir todos los campos requeridos en la respuesta', async () => {
        const mockResponse = {
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [
            {
              id: 'visitor-1',
              fingerprint: 'fp-123',
              connectionStatus: 'ONLINE',
              siteId: 'site-1',
              siteName: 'Test Site',
              currentUrl: 'https://example.com',
              userAgent: 'Mozilla/5.0',
              createdAt: new Date().toISOString(),
              lastActivity: new Date().toISOString(),
              pendingChatIds: ['chat-1', 'chat-2'],
              totalChatsCount: 5,
            },
          ],
          totalCount: 1,
          activeSitesCount: 1,
          timestamp: new Date(),
        };

        queryBusMock.execute.mockResolvedValue(mockResponse);

        const response = await authenticatedRequest(
          `/tenant-visitors/${validTenantId}/visitors`,
        );

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('tenantId');
        expect(response.body).toHaveProperty('companyName');
        expect(response.body).toHaveProperty('visitors');
        expect(response.body).toHaveProperty('totalCount');
        expect(response.body).toHaveProperty('activeSitesCount');
        expect(response.body).toHaveProperty('timestamp');

        const visitor = response.body.visitors[0];
        expect(visitor).toHaveProperty('id');
        expect(visitor).toHaveProperty('fingerprint');
        expect(visitor).toHaveProperty('connectionStatus');
        expect(visitor).toHaveProperty('siteId');
        expect(visitor).toHaveProperty('siteName');
        expect(visitor).toHaveProperty('lastActivity');
        expect(visitor).toHaveProperty('pendingChatIds');
        expect(visitor).toHaveProperty('totalChatsCount');
        expect(visitor.totalChatsCount).toBe(5);
      });
    });

    describe('Autenticación y autorización', () => {
      it('debe rechazar requests sin autenticación', async () => {
        const response = await request(app.getHttpServer()).get(
          `/tenant-visitors/${validTenantId}/visitors`,
        );

        expect(response.status).toBe(401);
      });

      it('debe aceptar rol commercial', async () => {
        queryBusMock.execute.mockResolvedValue({
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [],
          totalCount: 0,
          activeSitesCount: 0,
          timestamp: new Date(),
        });

        const response = await request(app.getHttpServer())
          .get(`/tenant-visitors/${validTenantId}/visitors`)
          .set('Authorization', 'Bearer commercial-token');

        expect(response.status).toBe(200);
      });

      it('debe aceptar rol admin', async () => {
        queryBusMock.execute.mockResolvedValue({
          tenantId: validTenantId,
          companyName: 'Test Company',
          visitors: [],
          totalCount: 0,
          activeSitesCount: 0,
          timestamp: new Date(),
        });

        const response = await request(app.getHttpServer())
          .get(`/tenant-visitors/${validTenantId}/visitors`)
          .set('Authorization', 'Bearer admin-token');

        expect(response.status).toBe(200);
      });
    });
  });

  describe('GET /tenant-visitors/:tenantId/visitors/unassigned-chats', () => {
    it('debe retornar visitantes con chats sin asignar', async () => {
      const mockResponse = {
        tenantId: validTenantId,
        companyName: 'Test Company',
        visitors: [
          {
            ...createMockVisitor('visitor-1', new Date(), new Date()),
            pendingChatIds: ['chat-1', 'chat-2'],
          },
        ],
        totalCount: 1,
        activeSitesCount: 1,
        timestamp: new Date(),
      };

      queryBusMock.execute.mockResolvedValue(mockResponse);

      const response = await authenticatedRequest(
        `/tenant-visitors/${validTenantId}/visitors/unassigned-chats`,
      );

      expect(response.status).toBe(200);
      expect(response.body.visitors).toHaveLength(1);
      expect(response.body.visitors[0].pendingChatIds).toHaveLength(2);
    });

    it('debe aplicar paginación en unassigned-chats', async () => {
      queryBusMock.execute.mockResolvedValue({
        tenantId: validTenantId,
        companyName: 'Test Company',
        visitors: [],
        totalCount: 50,
        activeSitesCount: 2,
        timestamp: new Date(),
      });

      const response = await authenticatedRequest(
        `/tenant-visitors/${validTenantId}/visitors/unassigned-chats?limit=10&offset=20`,
      );

      expect(response.status).toBe(200);
      expect(queryBusMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20,
        }),
      );
    });
  });

  describe('GET /tenant-visitors/:tenantId/visitors/queued-chats', () => {
    it('debe retornar visitantes con chats en cola', async () => {
      const mockResponse = {
        tenantId: validTenantId,
        companyName: 'Test Company',
        visitors: [
          {
            ...createMockVisitor('visitor-1', new Date(), new Date()),
            pendingChatIds: ['chat-1'],
          },
        ],
        totalCount: 1,
        activeSitesCount: 1,
        timestamp: new Date(),
      };

      queryBusMock.execute.mockResolvedValue(mockResponse);

      const response = await authenticatedRequest(
        `/tenant-visitors/${validTenantId}/visitors/queued-chats`,
      );

      expect(response.status).toBe(200);
      expect(response.body.visitors).toHaveLength(1);
    });

    it('debe aplicar paginación en queued-chats', async () => {
      queryBusMock.execute.mockResolvedValue({
        tenantId: validTenantId,
        companyName: 'Test Company',
        visitors: [],
        totalCount: 30,
        activeSitesCount: 3,
        timestamp: new Date(),
      });

      const response = await authenticatedRequest(
        `/tenant-visitors/${validTenantId}/visitors/queued-chats?limit=15&offset=15`,
      );

      expect(response.status).toBe(200);
      expect(queryBusMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 15,
          offset: 15,
        }),
      );
    });
  });

  // ========== FILTROS COMPLEJOS ==========

  describe('POST /tenant-visitors/:tenantId/visitors/search', () => {
    const authenticatedPostRequest = (path: string, body: object) => {
      return request(app.getHttpServer())
        .post(path)
        .set('Authorization', 'Bearer commercial-token')
        .send(body);
    };

    describe('Validación de parámetros', () => {
      it('debe rechazar tenantId inválido', async () => {
        const response = await authenticatedPostRequest(
          `/tenant-visitors/${invalidTenantId}/visitors/search`,
          {},
        );

        expect(response.status).toBe(400);
      });

      it('debe aceptar body vacío con valores por defecto', async () => {
        queryBusMock.execute.mockResolvedValue(
          ok({
            visitors: [],
            pagination: {
              total: 0,
              page: 1,
              limit: 20,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          }),
        );

        const response = await authenticatedPostRequest(
          `/tenant-visitors/${validTenantId}/visitors/search`,
          {},
        );

        expect(response.status).toBe(200);
      });
    });

    describe('Búsqueda con filtros', () => {
      it('debe buscar visitantes con filtro de lifecycle', async () => {
        queryBusMock.execute.mockResolvedValue(
          ok({
            visitors: [
              {
                id: 'visitor-1',
                tenantId: validTenantId,
                lifecycle: 'LEAD',
                connectionStatus: 'online',
              },
            ],
            pagination: {
              total: 1,
              page: 1,
              limit: 20,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          }),
        );

        const response = await authenticatedPostRequest(
          `/tenant-visitors/${validTenantId}/visitors/search`,
          {
            filters: { lifecycle: ['LEAD'] },
          },
        );

        expect(response.status).toBe(200);
        expect(response.body.visitors).toHaveLength(1);
        expect(queryBusMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: validTenantId,
            filters: expect.objectContaining({ lifecycle: ['LEAD'] }),
          }),
        );
      });

      it('debe aplicar ordenamiento personalizado', async () => {
        queryBusMock.execute.mockResolvedValue(
          ok({
            visitors: [],
            pagination: {
              total: 0,
              page: 1,
              limit: 20,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          }),
        );

        const response = await authenticatedPostRequest(
          `/tenant-visitors/${validTenantId}/visitors/search`,
          {
            sort: { field: 'createdAt', direction: 'ASC' },
          },
        );

        expect(response.status).toBe(200);
        expect(queryBusMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: expect.objectContaining({
              field: 'createdAt',
              direction: 'ASC',
            }),
          }),
        );
      });

      it('debe aplicar paginación correctamente', async () => {
        queryBusMock.execute.mockResolvedValue(
          ok({
            visitors: [],
            pagination: {
              total: 100,
              page: 3,
              limit: 10,
              totalPages: 10,
              hasNextPage: true,
              hasPreviousPage: true,
            },
          }),
        );

        const response = await authenticatedPostRequest(
          `/tenant-visitors/${validTenantId}/visitors/search`,
          {
            page: 3,
            limit: 10,
          },
        );

        expect(response.status).toBe(200);
        expect(response.body.pagination.page).toBe(3);
        expect(response.body.pagination.hasNextPage).toBe(true);
        expect(response.body.pagination.hasPreviousPage).toBe(true);
      });
    });

    describe('Autenticación', () => {
      it('debe rechazar requests sin autenticación', async () => {
        const response = await request(app.getHttpServer())
          .post(`/tenant-visitors/${validTenantId}/visitors/search`)
          .send({});

        expect(response.status).toBe(401);
      });
    });
  });

  describe('GET /tenant-visitors/:tenantId/visitors/filters/quick', () => {
    it('debe retornar configuración de filtros rápidos', async () => {
      queryBusMock.execute.mockResolvedValue(
        ok({
          filters: [
            { id: 'online', label: 'En línea', count: 10, isActive: false },
            { id: 'leads', label: 'Leads', count: 5, isActive: false },
          ],
        }),
      );

      const response = await authenticatedRequest(
        `/tenant-visitors/${validTenantId}/visitors/filters/quick`,
      );

      expect(response.status).toBe(200);
      expect(response.body.filters).toHaveLength(2);
      expect(response.body.filters[0]).toHaveProperty('id');
      expect(response.body.filters[0]).toHaveProperty('label');
      expect(response.body.filters[0]).toHaveProperty('count');
    });

    it('debe rechazar tenantId inválido', async () => {
      const response = await authenticatedRequest(
        `/tenant-visitors/${invalidTenantId}/visitors/filters/quick`,
      );

      expect(response.status).toBe(400);
    });

    it('debe rechazar requests sin autenticación', async () => {
      const response = await request(app.getHttpServer()).get(
        `/tenant-visitors/${validTenantId}/visitors/filters/quick`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe('GET /tenant-visitors/:tenantId/visitors/filters/saved', () => {
    it('debe retornar filtros guardados del usuario', async () => {
      queryBusMock.execute.mockResolvedValue(
        ok({
          filters: [
            {
              id: 'filter-1',
              name: 'Mis leads',
              description: 'Filtro de leads',
              filters: { lifecycle: ['lead'] },
              userId: 'test-user-id',
              tenantId: validTenantId,
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
        }),
      );

      const response = await authenticatedRequest(
        `/tenant-visitors/${validTenantId}/visitors/filters/saved`,
      );

      expect(response.status).toBe(200);
      expect(response.body.filters).toHaveLength(1);
      expect(response.body.filters[0].name).toBe('Mis leads');
      expect(response.body.total).toBe(1);
    });

    it('debe retornar lista vacía cuando no hay filtros', async () => {
      queryBusMock.execute.mockResolvedValue(
        ok({
          filters: [],
          total: 0,
        }),
      );

      const response = await authenticatedRequest(
        `/tenant-visitors/${validTenantId}/visitors/filters/saved`,
      );

      expect(response.status).toBe(200);
      expect(response.body.filters).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('debe rechazar requests sin autenticación', async () => {
      const response = await request(app.getHttpServer()).get(
        `/tenant-visitors/${validTenantId}/visitors/filters/saved`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe('POST /tenant-visitors/:tenantId/visitors/filters/saved', () => {
    const authenticatedPostRequest = (path: string, body: object) => {
      return request(app.getHttpServer())
        .post(path)
        .set('Authorization', 'Bearer commercial-token')
        .send(body);
    };

    it('debe guardar un filtro correctamente', async () => {
      const filterId = '123e4567-e89b-12d3-a456-426614174001';
      commandBusMock.execute.mockResolvedValue(ok(filterId));

      const response = await authenticatedPostRequest(
        `/tenant-visitors/${validTenantId}/visitors/filters/saved`,
        {
          name: 'Mi filtro',
          description: 'Descripción del filtro',
          filters: { lifecycle: ['LEAD'] },
        },
      );

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(filterId);
    });

    it('debe manejar error cuando se excede el límite de filtros', async () => {
      commandBusMock.execute.mockResolvedValue(
        err(new SavedFilterLimitExceededError(20)),
      );

      const response = await authenticatedPostRequest(
        `/tenant-visitors/${validTenantId}/visitors/filters/saved`,
        {
          name: 'Mi filtro',
          filters: { lifecycle: ['LEAD'] },
        },
      );

      // El error de dominio se lanza pero no tiene handler HTTP específico
      expect(response.status).toBe(500);
    });

    it('debe rechazar cuando falta el nombre', async () => {
      const response = await authenticatedPostRequest(
        `/tenant-visitors/${validTenantId}/visitors/filters/saved`,
        {
          filters: { lifecycle: ['LEAD'] },
        },
      );

      expect(response.status).toBe(400);
    });

    it('debe rechazar requests sin autenticación', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tenant-visitors/${validTenantId}/visitors/filters/saved`)
        .send({
          name: 'Mi filtro',
          filters: { lifecycle: ['LEAD'] },
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /tenant-visitors/:tenantId/visitors/filters/saved/:filterId', () => {
    const validFilterId = '123e4567-e89b-12d3-a456-426614174002';

    it('debe eliminar un filtro correctamente', async () => {
      commandBusMock.execute.mockResolvedValue(ok(undefined));

      const response = await request(app.getHttpServer())
        .delete(
          `/tenant-visitors/${validTenantId}/visitors/filters/saved/${validFilterId}`,
        )
        .set('Authorization', 'Bearer commercial-token');

      expect(response.status).toBe(204);
    });

    it('debe rechazar tenantId inválido', async () => {
      const response = await request(app.getHttpServer())
        .delete(
          `/tenant-visitors/${invalidTenantId}/visitors/filters/saved/${validFilterId}`,
        )
        .set('Authorization', 'Bearer commercial-token');

      expect(response.status).toBe(400);
    });

    it('debe rechazar filterId inválido', async () => {
      const response = await request(app.getHttpServer())
        .delete(
          `/tenant-visitors/${validTenantId}/visitors/filters/saved/invalid-uuid`,
        )
        .set('Authorization', 'Bearer commercial-token');

      expect(response.status).toBe(400);
    });

    it('debe rechazar requests sin autenticación', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/tenant-visitors/${validTenantId}/visitors/filters/saved/${validFilterId}`,
      );

      expect(response.status).toBe(401);
    });
  });
});
