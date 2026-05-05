import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common';
import { CqrsModule, QueryBus, CommandBus } from '@nestjs/cqrs';
import * as request from 'supertest';
import { CommercialController } from '../src/context/commercial/infrastructure/controllers/commercial.controller';
import { AuthGuard } from '../src/context/shared/infrastructure/guards/auth.guard';
import { RolesGuard } from '../src/context/shared/infrastructure/guards/role.guard';
import { VALIDATE_DOMAIN_API_KEY } from '../src/context/auth/auth-visitor/application/services/validate-domain-api-key';
import { COMPANY_REPOSITORY } from '../src/context/company/domain/company.repository';
import { GetCommercialAvailabilityBySiteQuery } from '../src/context/commercial/application/queries/get-commercial-availability-by-site.query';

// Guards mock que dejan pasar todas las peticiones
class MockPassGuard {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

// Helper para crear un company mock con getId().value y getSites()
function makeMockCompany(companyId: string, domain: string, siteId: string) {
  return {
    getId: () => ({ value: companyId }),
    getSites: () => ({
      toPrimitives: () => [
        {
          id: siteId,
          canonicalDomain: domain,
          domainAliases: [],
        },
      ],
    }),
  };
}

describe('CommercialController - POST /v2/commercials/availability (e2e)', () => {
  let app: INestApplication;

  const companyId = '550e8400-e29b-41d4-a716-446655440001';
  const siteId = '550e8400-e29b-41d4-a716-446655440002';
  const domain = 'example.com';
  const validApiKey = 'valid-api-key';

  let mockQueryBus: { execute: jest.Mock };
  let mockApiKeyValidator: { validate: jest.Mock };
  let mockCompanyRepository: { findByDomain: jest.Mock };

  beforeEach(async () => {
    mockQueryBus = {
      execute: jest.fn(),
    };

    mockApiKeyValidator = {
      validate: jest.fn().mockResolvedValue(true),
    };

    mockCompanyRepository = {
      findByDomain: jest.fn().mockResolvedValue({
        isErr: () => false,
        value: makeMockCompany(companyId, domain, siteId),
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CommercialController],
      imports: [CqrsModule],
      providers: [
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
        {
          provide: CommandBus,
          useValue: { execute: jest.fn() },
        },
        {
          provide: VALIDATE_DOMAIN_API_KEY,
          useValue: mockApiKeyValidator,
        },
        {
          provide: COMPANY_REPOSITORY,
          useValue: mockCompanyRepository,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockPassGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockPassGuard)
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

  afterEach(async () => {
    await app.close();
  });

  describe('Fix cross-tenant: companyId propagado a la query', () => {
    it('debe pasar companyId a GetCommercialAvailabilityBySiteQuery cuando hay comerciales disponibles', async () => {
      mockQueryBus.execute.mockResolvedValue({
        available: true,
        onlineCount: 2,
        timestamp: new Date().toISOString(),
        siteId,
      });

      const response = await request(app.getHttpServer())
        .post('/v2/commercials/availability')
        .send({ domain, apiKey: validApiKey })
        .expect(200);

      expect(response.body.available).toBe(true);
      expect(response.body.onlineCount).toBe(2);

      // Verificar que la query incluye companyId (fix cross-tenant)
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          siteId,
          companyId,
        }),
      );

      const calledQuery: GetCommercialAvailabilityBySiteQuery =
        mockQueryBus.execute.mock.calls[0][0];
      expect(calledQuery).toBeInstanceOf(GetCommercialAvailabilityBySiteQuery);
      expect(calledQuery.companyId).toBe(companyId);
    });

    it('debe retornar available=false cuando no hay comerciales online para el tenant', async () => {
      mockQueryBus.execute.mockResolvedValue({
        available: false,
        onlineCount: 0,
        timestamp: new Date().toISOString(),
        siteId,
      });

      const response = await request(app.getHttpServer())
        .post('/v2/commercials/availability')
        .send({ domain, apiKey: validApiKey })
        .expect(200);

      expect(response.body.available).toBe(false);
      expect(response.body.onlineCount).toBe(0);
    });

    it('debe retornar 401 si la API Key es inválida', async () => {
      mockApiKeyValidator.validate.mockResolvedValue(false);

      await request(app.getHttpServer())
        .post('/v2/commercials/availability')
        .send({ domain, apiKey: 'invalid-key' })
        .expect(401);
    });

    it('debe retornar 404 si el dominio no existe', async () => {
      mockCompanyRepository.findByDomain.mockResolvedValue({
        isErr: () => true,
        error: new Error('Not found'),
      });

      await request(app.getHttpServer())
        .post('/v2/commercials/availability')
        .send({ domain: 'unknown.com', apiKey: validApiKey })
        .expect(404);
    });

    it('debe retornar 400 si faltan campos requeridos', async () => {
      await request(app.getHttpServer())
        .post('/v2/commercials/availability')
        .send({ domain })
        // Sin apiKey
        .expect(400);
    });
  });
});
