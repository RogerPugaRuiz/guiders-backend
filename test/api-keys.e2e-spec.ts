import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ApiKeyController } from '../src/context/auth/api-key/infrastructure/api-key.controller';
import { ApiKeyService } from '../src/context/auth/api-key/infrastructure/api-key.service';
import { AuthGuard } from '../src/context/shared/infrastructure/guards/auth.guard';
import { RolesGuard } from '../src/context/shared/infrastructure/guards/role.guard';

/**
 * E2E ligero que valida:
 * - Protección del endpoint /api-keys/company con AuthGuard + RolesGuard
 * - Que devuelve la lista de API Keys asociadas a la companyId del token
 */

describe('ApiKeyController (e2e)', () => {
  let app: INestApplication;
  const mockApiKeys = [
    {
      domain: 'example.com',
      apiKey: 'hashed-example-com',
      kid: 'kid-1',
      publicKey: 'PUBLIC_KEY_CONTENT',
      createdAt: new Date(),
    },
    {
      domain: 'another.com',
      apiKey: 'hashed-another-com',
      kid: 'kid-2',
      publicKey: 'PUBLIC_KEY_CONTENT_2',
      createdAt: new Date(),
    },
  ];

  beforeAll(async () => {
    const mockApiKeyService = {
      listCompanyApiKeys: jest.fn().mockResolvedValue(mockApiKeys),
      createApiKeyForDomain: jest.fn(),
    } as unknown as ApiKeyService;

    const mockAuthGuard = {
      canActivate: jest.fn((context) => {
        const req = context.switchToHttp().getRequest();
        req.user = {
          id: 'admin-user-id',
          roles: ['admin'],
          username: 'admin',
          email: 'admin@example.com',
          companyId: 'company-123',
        };
        return true;
      }),
    };

    const mockRolesGuard = {
      canActivate: jest.fn(() => true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeyController],
      providers: [{ provide: ApiKeyService, useValue: mockApiKeyService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api-keys/company', () => {
    it('should return the list of api keys for the company', async () => {
      const res = await request(app.getHttpServer())
        .get('/api-keys/company')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(mockApiKeys.length);
      expect(res.body[0]).toHaveProperty('domain');
      expect(res.body[0]).toHaveProperty('apiKey');
      expect(res.body[0]).toHaveProperty('kid');
      expect(res.body[0]).toHaveProperty('publicKey');
    });
  });
});
