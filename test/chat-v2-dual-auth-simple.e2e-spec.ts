import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import * as request from 'supertest';
import { ChatV2Controller } from '../src/context/conversations-v2/infrastructure/controllers/chat-v2.controller';
import { CqrsModule, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AuthGuard } from '../src/context/shared/infrastructure/guards/auth.guard';
import { DualAuthGuard } from '../src/context/shared/infrastructure/guards/dual-auth.guard';
import { RolesGuard } from '../src/context/shared/infrastructure/guards/role.guard';
import { OptionalAuthGuard } from '../src/context/shared/infrastructure/guards/optional-auth.guard';
import { GetChatsWithFiltersQuery } from '../src/context/conversations-v2/application/queries/get-chats-with-filters.query';

// Mock query handler for GetChatsWithFiltersQuery
@Injectable()
@QueryHandler(GetChatsWithFiltersQuery)
class MockGetChatsWithFiltersQueryHandler
  implements IQueryHandler<GetChatsWithFiltersQuery>
{
  execute(_query: GetChatsWithFiltersQuery): Promise<any> {
    return Promise.resolve({
      chats: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
    });
  }
}

// Mock guards
@Injectable()
class MockAuthGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

@Injectable()
class MockRolesGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

@Injectable()
class MockOptionalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // OptionalAuthGuard permite siempre el acceso
    // Solo setea el usuario si hay autenticación válida
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.includes('Bearer valid-token')) {
      request.user = {
        id: 'authenticated-user',
        roles: ['visitor'],
        sub: 'authenticated-user',
      };
    }
    // Si no hay token válido o no hay token, continúa sin usuario (acceso público)
    return true;
  }
}

describe('ChatV2Controller - Dual Authentication Simple E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ChatV2Controller],
      imports: [CqrsModule],
      providers: [MockGetChatsWithFiltersQueryHandler],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .overrideGuard(OptionalAuthGuard)
      .useClass(MockOptionalAuthGuard)
      .overrideGuard(DualAuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /v2/chats/visitor/:visitorId', () => {
    const visitorId = 'test-visitor-123';

    it('debe devolver 200 cuando no hay autenticación (acceso público)', async () => {
      await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .expect(200);
    });

    it('debe devolver 200 con token JWT inválido (OptionalAuthGuard permite continuar)', async () => {
      await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(200);
    });

    it('debe devolver 200 con cookie de sesión inválida (acceso público)', async () => {
      await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .set('Cookie', ['x-guiders-sid=invalid-session-id'])
        .expect(200);
    });

    it('debe utilizar el OptionalAuthGuard según la documentación Swagger', async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/chats/visitor/${visitorId}?limit=20`)
        .expect(200);

      // Verificar que la respuesta viene con estructura esperada
      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('chats');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('hasMore');
    });
  });
});
