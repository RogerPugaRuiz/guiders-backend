import {
  INestApplication,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthUserController } from '../src/context/auth/auth-user/infrastructure/controllers/auth-user.controller';
import { AuthUserService } from '../src/context/auth/auth-user/infrastructure/services/auth-user.service';
import { RolesGuard } from '../src/context/shared/infrastructure/guards/role.guard';
import { DualAuthGuard } from '../src/context/shared/infrastructure/guards/dual-auth.guard';
import { AuthGuard } from '../src/context/shared/infrastructure/guards/auth.guard';
import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import { FindOneUserByIdQuery } from '../src/context/auth/auth-user/application/read/find-one-user-by-id.query';
import { FindUserByKeycloakIdQuery } from '../src/context/auth/auth-user/application/queries/find-user-by-keycloak-id.query';
import { Optional } from '../src/context/shared/domain/optional';
import { UserAccountPrimitives } from '../src/context/auth/auth-user/domain/user-account.aggregate';
import { err } from '../src/context/shared/domain/result';
import { RepositoryError } from '../src/context/shared/domain/errors/repository.error';

// Mock AuthUserService (solo métodos usados indirectamente por el controlador en otros endpoints)
const mockAuthUserService: Partial<AuthUserService> = {
  login: jest.fn(),
  register: jest.fn(),
  refresh: jest.fn(),
  validate: jest.fn(),
  logout: jest.fn(),
};

// Usuario base simulado
const baseUser: UserAccountPrimitives = {
  id: 'user-123',
  email: 'user@example.com',
  name: 'User Example',
  password: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-02T00:00:00Z'),
  lastLoginAt: null,
  roles: ['admin'],
  companyId: 'company-xyz',
  isActive: true,
  keycloakId: null,
  avatarUrl: null,
};

const commercialUser: UserAccountPrimitives = {
  id: 'commercial-user-1',
  email: 'commercial@example.com',
  name: 'Commercial User',
  password: null,
  createdAt: new Date('2025-02-01T00:00:00Z'),
  updatedAt: new Date('2025-02-02T00:00:00Z'),
  lastLoginAt: null,
  roles: ['commercial'],
  companyId: 'company-xyz',
  isActive: true,
  keycloakId: null,
  avatarUrl: null,
};

// Mock QueryBus
class MockQueryBus {
  // Tipado laxo para emular QueryBus genérico evitando any
  execute(query: unknown): Promise<any> {
    const q: any = query;

    // Handle FindUserByKeycloakIdQuery (returns Result)
    if (q instanceof FindUserByKeycloakIdQuery) {
      // No tenemos usuarios con Keycloak ID en este test, retornar error
      return Promise.resolve(
        err(new RepositoryError('User not found by Keycloak ID')),
      );
    }

    // Handle FindOneUserByIdQuery (returns Optional)
    if (q instanceof FindOneUserByIdQuery) {
      if (q.userId === baseUser.id) {
        return Promise.resolve(Optional.of({ user: baseUser }));
      }
      if (q.userId === 'missing-user') {
        return Promise.resolve(Optional.empty());
      }
      if (q.userId === commercialUser.id) {
        return Promise.resolve(Optional.of({ user: commercialUser }));
      }
    }

    return Promise.resolve(Optional.empty());
  }
}

// Mock Guards
class MockDualAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization as string | undefined;
    if (!auth) throw new UnauthorizedException('Token requerido');
    const token = auth.split(' ')[1];
    // token decide user id
    if (token === 'valid-admin-token') {
      req.user = {
        id: baseUser.id,
        roles: ['admin'],
        username: baseUser.name,
        email: baseUser.email,
        companyId: baseUser.companyId,
      };
    } else if (token === 'valid-commercial-token') {
      req.user = {
        id: 'commercial-user-1',
        roles: ['commercial'],
        username: 'Commercial User',
        email: 'commercial@example.com',
        companyId: baseUser.companyId,
      };
    } else if (token === 'missing-user-token') {
      req.user = {
        id: 'missing-user',
        roles: ['admin'],
        username: 'Ghost',
        email: 'ghost@example.com',
        companyId: baseUser.companyId,
      };
    } else if (token === 'invalid-role-token') {
      req.user = {
        id: baseUser.id,
        roles: ['visitor'],
        username: baseUser.name,
        email: baseUser.email,
        companyId: baseUser.companyId,
      };
    } else {
      throw new UnauthorizedException('Token inválido');
    }
    return true;
  }
}

class MockRolesGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const roles: string[] = req.user?.roles ?? [];
    // /me requiere admin o commercial
    return roles.includes('admin') || roles.includes('commercial');
  }
}

describe('AuthUserController /user/auth/me (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [AuthUserController],
      providers: [
        { provide: AuthUserService, useValue: mockAuthUserService },
        { provide: QueryBus, useClass: MockQueryBus },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockDualAuthGuard)
      .overrideGuard(DualAuthGuard)
      .useClass(MockDualAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('debe retornar 401 si no hay token', async () => {
    await request(app.getHttpServer()).get('/user/auth/me').expect(401);
  });

  it('debe retornar la información del usuario (admin)', async () => {
    const res = await request(app.getHttpServer())
      .get('/user/auth/me')
      .set('Authorization', 'Bearer valid-admin-token')
      .expect(200);

    expect(res.body).toMatchObject({
      id: baseUser.id,
      email: baseUser.email,
      name: baseUser.name,
      roles: baseUser.roles,
      companyId: baseUser.companyId,
      isActive: true,
    });
    expect(res.body).toHaveProperty('createdAt');
    expect(res.body).toHaveProperty('updatedAt');
  });

  it('debe permitir rol commercial y retornar datos del usuario commercial', async () => {
    const res = await request(app.getHttpServer())
      .get('/user/auth/me')
      .set('Authorization', 'Bearer valid-commercial-token')
      .expect(200);

    expect(res.body.roles).toContain('commercial');
    expect(res.body.email).toBe('commercial@example.com');
    expect(res.body.name).toBe('Commercial User');
  });

  it('debe retornar 404 si el usuario no existe en persistencia', async () => {
    await request(app.getHttpServer())
      .get('/user/auth/me')
      .set('Authorization', 'Bearer missing-user-token')
      .expect(404);
  });

  it('debe retornar 403 si el rol no es válido para /me', async () => {
    // El AuthGuard añade roles=[visitor] y RolesGuard debe bloquear
    await request(app.getHttpServer())
      .get('/user/auth/me')
      .set('Authorization', 'Bearer invalid-role-token')
      .expect(403);
  });
});
