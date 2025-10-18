import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthVisitorController } from '../src/context/auth/auth-visitor/infrastructure/auth-visitor.controller';
import { AuthVisitorService } from '../src/context/auth/auth-visitor/infrastructure/services/auth-visitor.service';
import {
  API_KEY_REPOSITORY,
  ApiKeyRepository,
} from '../src/context/auth/api-key/domain/repository/api-key.repository';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '../src/context/company/domain/company.repository';
import { ApiKey } from '../src/context/auth/api-key/domain/model/api-key';
import { Company } from '../src/context/company/domain/company.aggregate';
import { ok, err } from '../src/context/shared/domain/result';
import { DomainError } from '../src/context/shared/domain/domain.error';

// Error personalizado para tests
class CompanyNotFoundError extends DomainError {
  constructor(message = 'Company not found') {
    super(message);
  }
}

describe('Pixel Metadata E2E', () => {
  let app: INestApplication;
  let mockApiKeyRepository: jest.Mocked<ApiKeyRepository>;
  let mockCompanyRepository: jest.Mocked<CompanyRepository>;
  let mockAuthVisitorService: jest.Mocked<AuthVisitorService>;

  // Mock data
  const testApiKey =
    '12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0';
  const testDomain = 'example.com';
  const testCompanyId = 'a1b2c3d4-e5f6-4a1b-8c9d-0e1f2a3b4c5d';
  const testSiteId = 'b2c3d4e5-f6a7-4b2c-9d0e-1f2a3b4c5d6e';

  // Helper para crear mock de ApiKey
  const createMockApiKey = (
    apiKey: string,
    domain: string,
    companyId: string,
  ): ApiKey => {
    return ApiKey.fromPrimitive({
      id: 'c3d4e5f6-a7b8-4c3d-ae0f-2a3b4c5d6e7f',
      apiKey,
      kid: 'kid-12345',
      domain,
      publicKey: 'mock-public-key',
      privateKey: 'mock-private-key',
      companyId,
      createdAt: new Date('2024-01-01'),
    });
  };

  // Helper para crear mock de Company con Sites
  const createMockCompany = (
    companyId: string,
    companyName: string,
    sites: any[],
  ): Company => {
    return Company.fromPrimitives({
      id: companyId,
      companyName: companyName,
      sites,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
  };

  beforeEach(async () => {
    // Mock del AuthVisitorService
    mockAuthVisitorService = {
      register: jest.fn(),
      tokens: jest.fn(),
      refresh: jest.fn(),
    } as any;

    // Mock del ApiKeyRepository
    mockApiKeyRepository = {
      save: jest.fn(),
      getApiKeyByDomain: jest.fn(),
      getApiKeyByApiKey: jest.fn(),
      getAllApiKeys: jest.fn(),
      getApiKeysByCompanyId: jest.fn(),
    } as any;

    // Mock del CompanyRepository
    mockCompanyRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findByDomain: jest.fn(),
    } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthVisitorController],
      providers: [
        {
          provide: AuthVisitorService,
          useValue: mockAuthVisitorService,
        },
        {
          provide: API_KEY_REPOSITORY,
          useValue: mockApiKeyRepository,
        },
        {
          provide: COMPANY_REPOSITORY,
          useValue: mockCompanyRepository,
        },
      ],
    }).compile();

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

  afterEach(async () => {
    await app.close();
  });

  describe('GET /pixel/metadata', () => {
    it('debe devolver tenantId y siteId cuando el apiKey es válido', async () => {
      // Arrange
      const mockApiKeyEntity = createMockApiKey(
        testApiKey,
        testDomain,
        testCompanyId,
      );
      const mockCompany = createMockCompany(testCompanyId, 'Test Company', [
        {
          id: testSiteId,
          canonicalDomain: testDomain,
          domainAliases: [],
          name: 'Test Site',
        },
      ]);

      mockApiKeyRepository.getApiKeyByApiKey.mockResolvedValue(
        mockApiKeyEntity,
      );
      mockCompanyRepository.findByDomain.mockResolvedValue(ok(mockCompany));

      // Act
      const response = await request(app.getHttpServer())
        .get('/pixel/metadata')
        .query({ apiKey: testApiKey })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('tenantId', testCompanyId);
      expect(response.body).toHaveProperty('siteId', testSiteId);
      expect(response.body).toHaveProperty('domain', testDomain);
      expect(mockApiKeyRepository.getApiKeyByApiKey).toHaveBeenCalledWith(
        expect.objectContaining({ value: testApiKey }),
      );
      expect(mockCompanyRepository.findByDomain).toHaveBeenCalledWith(
        testDomain,
      );
    });

    it('debe devolver 400 cuando no se proporciona apiKey', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/pixel/metadata')
        .expect(400);

      // Assert
      expect(response.body.message).toContain('API Key es requerida');
      expect(mockApiKeyRepository.getApiKeyByApiKey).not.toHaveBeenCalled();
    });

    it('debe devolver 404 cuando el apiKey no existe', async () => {
      // Arrange
      mockApiKeyRepository.getApiKeyByApiKey.mockResolvedValue(null);

      // Act
      const response = await request(app.getHttpServer())
        .get('/pixel/metadata')
        .query({ apiKey: 'invalid-api-key' })
        .expect(404);

      // Assert
      expect(response.body.message).toContain('API Key no encontrada');
      expect(mockCompanyRepository.findByDomain).not.toHaveBeenCalled();
    });

    it('debe devolver 404 cuando no se encuentra la empresa', async () => {
      // Arrange
      const mockApiKeyEntity = createMockApiKey(
        testApiKey,
        testDomain,
        testCompanyId,
      );
      mockApiKeyRepository.getApiKeyByApiKey.mockResolvedValue(
        mockApiKeyEntity,
      );
      mockCompanyRepository.findByDomain.mockResolvedValue(
        err(new CompanyNotFoundError()),
      );

      // Act
      const response = await request(app.getHttpServer())
        .get('/pixel/metadata')
        .query({ apiKey: testApiKey })
        .expect(404);

      // Assert
      expect(response.body.message).toContain('No se encontró una empresa');
    });

    it('debe devolver 404 cuando no se encuentra un sitio específico para el dominio', async () => {
      // Arrange
      const mockApiKeyEntity = createMockApiKey(
        testApiKey,
        testDomain,
        testCompanyId,
      );
      const mockCompany = createMockCompany(testCompanyId, 'Test Company', [
        {
          id: testSiteId,
          canonicalDomain: 'other-domain.com',
          domainAliases: [],
          name: 'Other Site',
        },
      ]);

      mockApiKeyRepository.getApiKeyByApiKey.mockResolvedValue(
        mockApiKeyEntity,
      );
      mockCompanyRepository.findByDomain.mockResolvedValue(ok(mockCompany));

      // Act
      const response = await request(app.getHttpServer())
        .get('/pixel/metadata')
        .query({ apiKey: testApiKey })
        .expect(404);

      // Assert
      expect(response.body.message).toContain(
        'No se encontró un sitio específico',
      );
    });

    it('debe encontrar el sitio por alias de dominio', async () => {
      // Arrange
      const alias = 'www.example.com';
      const mockApiKeyEntity = createMockApiKey(
        testApiKey,
        alias,
        testCompanyId,
      );
      const mockCompany = createMockCompany(testCompanyId, 'Test Company', [
        {
          id: testSiteId,
          canonicalDomain: testDomain,
          domainAliases: [alias],
          name: 'Test Site',
        },
      ]);

      mockApiKeyRepository.getApiKeyByApiKey.mockResolvedValue(
        mockApiKeyEntity,
      );
      mockCompanyRepository.findByDomain.mockResolvedValue(ok(mockCompany));

      // Act
      const response = await request(app.getHttpServer())
        .get('/pixel/metadata')
        .query({ apiKey: testApiKey })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('tenantId', testCompanyId);
      expect(response.body).toHaveProperty('siteId', testSiteId);
      expect(response.body).toHaveProperty('domain', alias);
    });

    it('debe manejar empresas con múltiples sitios correctamente', async () => {
      // Arrange
      const mockApiKeyEntity = createMockApiKey(
        testApiKey,
        testDomain,
        testCompanyId,
      );
      const secondSiteId = 'e5f6a7b8-c9d0-4e1f-a2b3-4c5d6e7f8a9b';
      const mockCompany = createMockCompany(testCompanyId, 'Test Company', [
        {
          id: secondSiteId,
          canonicalDomain: 'blog.example.com',
          domainAliases: [],
          name: 'Blog Site',
        },
        {
          id: testSiteId,
          canonicalDomain: testDomain,
          domainAliases: [],
          name: 'Main Site',
        },
      ]);

      mockApiKeyRepository.getApiKeyByApiKey.mockResolvedValue(
        mockApiKeyEntity,
      );
      mockCompanyRepository.findByDomain.mockResolvedValue(ok(mockCompany));

      // Act
      const response = await request(app.getHttpServer())
        .get('/pixel/metadata')
        .query({ apiKey: testApiKey })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('tenantId', testCompanyId);
      expect(response.body).toHaveProperty('siteId', testSiteId); // Debe encontrar el correcto
      expect(response.body).toHaveProperty('domain', testDomain);
    });
  });
});
