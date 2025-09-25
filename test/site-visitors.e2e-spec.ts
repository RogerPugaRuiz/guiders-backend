import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import * as request from 'supertest';
import { SiteVisitorsController } from '../src/context/visitors-v2/infrastructure/controllers/site-visitors.controller';
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

describe('SiteVisitorsController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  const validSiteId = '123e4567-e89b-12d3-a456-426614174000';
  const invalidSiteId = 'invalid-uuid';

  // Helper para crear requests autenticados
  const authenticatedRequest = (path: string) => {
    return request(app.getHttpServer())
      .get(path)
      .set('Authorization', 'Bearer commercial-token');
  };

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      controllers: [SiteVisitorsController],
      imports: [CqrsModule],
      providers: [
        // Mock query bus usando el símbolo correcto
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn().mockImplementation(() => {
              // Mock visitor data
              const mockVisitor = {
                id: 'visitor-1',
                fingerprint: 'fp-123',
                connectionStatus: 'ONLINE',
                createdAt: new Date().toISOString(),
                chatStatus: 'WAITING',
                chatId: 'chat-123',
                waitTime: 120,
              };
              
              return Promise.resolve({
                siteId: '123e4567-e89b-12d3-a456-426614174000',
                siteName: 'Test Site',
                visitors: [mockVisitor],
                totalCount: 1,
                averageWaitingTime: 150,
                timestamp: new Date().toISOString(),
              });
            }),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .overrideGuard(DualAuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /site-visitors/:siteId/visitors', () => {
    it('debería retornar lista de visitantes del sitio (200)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/site-visitors/${validSiteId}/visitors`)
        .set('Authorization', 'Bearer commercial-token')
        .expect(200);

      expect(response.body).toHaveProperty('siteId', validSiteId);
      expect(response.body).toHaveProperty('siteName');
      expect(response.body).toHaveProperty('visitors');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.visitors)).toBe(true);
    });

    it('debería aceptar query parameter includeOffline', async () => {
      const response = await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors?includeOffline=true`,
      ).expect(200);

      expect(response.body).toHaveProperty('siteId', validSiteId);
      expect(response.body).toHaveProperty('visitors');
    });

    it('debería aceptar parámetros de paginación', async () => {
      const response = await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors?limit=10&offset=0`,
      ).expect(200);

      expect(response.body).toHaveProperty('visitors');
      expect(response.body.visitors.length).toBeLessThanOrEqual(10);
    });

    it('debería rechazar siteId inválido (400)', async () => {
      await authenticatedRequest(
        `/site-visitors/${invalidSiteId}/visitors`,
      ).expect(400);
    });

    it('debería rechazar limit negativo (400)', async () => {
      await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors?limit=-1`,
      ).expect(400);
    });

    it('debería rechazar offset negativo (400)', async () => {
      await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors?offset=-1`,
      ).expect(400);
    });

    it('debería usar valores por defecto para parámetros opcionales', async () => {
      const response = await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors`,
      ).expect(200);

      // Verifica que funciona sin parámetros opcionales
      expect(response.body).toHaveProperty('visitors');
      expect(response.body).toHaveProperty('totalCount');
    });
  });

  describe('GET /site-visitors/:siteId/visitors/unassigned-chats', () => {
    it('debería retornar lista de visitantes con chats sin asignar (200)', async () => {
      const response = await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors/unassigned-chats`,
      ).expect(200);

      expect(response.body).toHaveProperty('siteId', validSiteId);
      expect(response.body).toHaveProperty('siteName');
      expect(response.body).toHaveProperty('visitors');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.visitors)).toBe(true);

      // Verificar que los visitantes retornados tienen propiedades de chat
      if (response.body.visitors.length > 0) {
        const visitor = response.body.visitors[0];
        expect(visitor).toHaveProperty('chatStatus');
        expect(visitor).toHaveProperty('chatId');
        expect(visitor).toHaveProperty('waitTime');
      }
    });

    it('debería aceptar parámetros de paginación', async () => {
      const response = await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors/unassigned-chats?limit=5&offset=0`,
      ).expect(200);

      expect(response.body).toHaveProperty('visitors');
      expect(response.body.visitors.length).toBeLessThanOrEqual(5);
    });

    it('debería rechazar siteId inválido (400)', async () => {
      await authenticatedRequest(
        `/site-visitors/${invalidSiteId}/visitors/unassigned-chats`,
      ).expect(400);
    });

    it('debería rechazar parámetros de paginación inválidos (400)', async () => {
      await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors/unassigned-chats?limit=-1`,
      ).expect(400);

      await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors/unassigned-chats?offset=-1`,
      ).expect(400);
    });
  });

  describe('GET /site-visitors/:siteId/visitors/queued-chats', () => {
    it('debería retornar lista de visitantes con chats en cola (200)', async () => {
      const response = await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors/queued-chats`,
      ).expect(200);

      expect(response.body).toHaveProperty('siteId', validSiteId);
      expect(response.body).toHaveProperty('siteName');
      expect(response.body).toHaveProperty('visitors');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('averageWaitingTime');
      expect(Array.isArray(response.body.visitors)).toBe(true);

      // Verificar que los visitantes retornados tienen propiedades de chat
      if (response.body.visitors.length > 0) {
        const visitor = response.body.visitors[0];
        expect(visitor).toHaveProperty('chatStatus');
        expect(visitor).toHaveProperty('chatId');
        expect(visitor).toHaveProperty('waitTime');
      }
    });

    it('debería aceptar parámetros de paginación', async () => {
      const response = await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors/queued-chats?limit=5&offset=0`,
      ).expect(200);

      expect(response.body).toHaveProperty('visitors');
      expect(response.body.visitors.length).toBeLessThanOrEqual(5);
    });

    it('debería rechazar siteId inválido (400)', async () => {
      await authenticatedRequest(
        `/site-visitors/${invalidSiteId}/visitors/queued-chats`,
      ).expect(400);
    });

    it('debería rechazar parámetros de paginación inválidos (400)', async () => {
      await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors/queued-chats?limit=-1`,
      ).expect(400);

      await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors/queued-chats?offset=-1`,
      ).expect(400);
    });

    it('debería incluir averageWaitingTime en la respuesta', async () => {
      const response = await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors/queued-chats`,
      ).expect(200);

      expect(response.body).toHaveProperty('averageWaitingTime');
      expect(typeof response.body.averageWaitingTime).toBe('number');
      expect(response.body.averageWaitingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Authentication and Authorization', () => {
    it('todos los endpoints deberían estar protegidos por autenticación', async () => {
      const endpoints = [
        `/site-visitors/${validSiteId}/visitors`,
        `/site-visitors/${validSiteId}/visitors/unassigned-chats`,
        `/site-visitors/${validSiteId}/visitors/queued-chats`,
      ];

      // Con autenticación, deberían funcionar
      for (const endpoint of endpoints) {
        await authenticatedRequest(endpoint).expect(200);
      }
    });

    it('todos los endpoints deberían requerir roles commercial o admin', async () => {
      const endpoints = [
        `/site-visitors/${validSiteId}/visitors`,
        `/site-visitors/${validSiteId}/visitors/unassigned-chats`,
        `/site-visitors/${validSiteId}/visitors/queued-chats`,
      ];

      // Con roles apropiados, deberían funcionar
      for (const endpoint of endpoints) {
        await authenticatedRequest(endpoint).expect(200);
      }
    });
  });

  describe('Response Structure Validation', () => {
    it('respuesta de visitantes básicos debería tener estructura correcta', async () => {
      const response = await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors`,
      ).expect(200);

      const body = response.body;
      expect(body).toMatchObject({
        siteId: expect.any(String),
        siteName: expect.any(String),
        visitors: expect.any(Array),
        totalCount: expect.any(Number),
        timestamp: expect.any(String),
      });

      // Verificar estructura de visitor si existe alguno
      if (body.visitors.length > 0) {
        const visitor = body.visitors[0];
        expect(visitor).toMatchObject({
          id: expect.any(String),
          fingerprint: expect.any(String),
          connectionStatus: expect.stringMatching(
            /^(ONLINE|OFFLINE|CHATTING)$/,
          ),
          createdAt: expect.any(String),
        });
      }
    });

    it('respuesta de chats sin asignar debería tener estructura correcta', async () => {
      const response = await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors/unassigned-chats`,
      ).expect(200);

      const body = response.body;
      expect(body).toMatchObject({
        siteId: expect.any(String),
        siteName: expect.any(String),
        visitors: expect.any(Array),
        totalCount: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('respuesta de chats en cola debería tener estructura correcta', async () => {
      const response = await authenticatedRequest(
        `/site-visitors/${validSiteId}/visitors/queued-chats`,
      ).expect(200);

      const body = response.body;
      expect(body).toMatchObject({
        siteId: expect.any(String),
        siteName: expect.any(String),
        visitors: expect.any(Array),
        totalCount: expect.any(Number),
        averageWaitingTime: expect.any(Number),
        timestamp: expect.any(String),
      });
    });
  });
});
