import { Test, TestingModule } from '@nestjs/testing';
import { CreateApiKeyForDomainUseCase } from '../create-api-key-for-domain.usecase';
import { ApiKeyRepository } from 'src/context/auth/api-key/domain/repository/api-key.repository';
import { ApiKeyGenerateKeys } from 'src/context/auth/api-key/application/services/api-key-generate-keys';
import { ApiKeyEncryptPrivateKey } from 'src/context/auth/api-key/application/services/api-key-encrypt-private-key';
import { ApiKeyHasher } from 'src/context/auth/api-key/application/services/api-key-hasher';
import { ApiKeyDomain } from 'src/context/auth/api-key/domain/model/api-key-domain';
import { ApiKey } from 'src/context/auth/api-key/domain/model/api-key';
import { ApiKeyValue } from 'src/context/auth/api-key/domain/model/api-key-value';
import { ApiKeyCompanyId } from 'src/context/auth/api-key/domain/model/api-key-company-id';
import { ApiKeyKid } from 'src/context/auth/api-key/domain/model/api-key-kid';
import { ApiKeyPrivateKey } from 'src/context/auth/api-key/domain/model/api-key-private-key';
import { ApiKeyPublicKey } from 'src/context/auth/api-key/domain/model/api-key-public-key';

describe('CreateApiKeyForDomainUseCase', () => {
  let useCase: CreateApiKeyForDomainUseCase;
  let apiKeyRepository: jest.Mocked<ApiKeyRepository>;
  let keysGenerator: jest.Mocked<ApiKeyGenerateKeys>;
  let encryptService: jest.Mocked<ApiKeyEncryptPrivateKey>;
  let hashService: jest.Mocked<ApiKeyHasher>;

  beforeEach(async () => {
    const mockApiKeyRepository = {
      save: jest.fn(),
      getApiKeyByDomain: jest.fn(),
      getApiKeyByApiKey: jest.fn(),
      getAllApiKeys: jest.fn(),
    };

    const mockKeysGenerator = {
      generate: jest.fn(),
    };

    const mockEncryptService = {
      encrypt: jest.fn(),
    };

    const mockHashService = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateApiKeyForDomainUseCase,
        {
          provide: 'API_KEY_REPOSITORY',
          useValue: mockApiKeyRepository,
        },
        {
          provide: 'ApiKeyGenerateKeys',
          useValue: mockKeysGenerator,
        },
        {
          provide: 'ApiKeyEncryptPrivateKey',
          useValue: mockEncryptService,
        },
        {
          provide: 'ApiKeyHasher',
          useValue: mockHashService,
        },
      ],
    }).compile();

    useCase = module.get<CreateApiKeyForDomainUseCase>(
      CreateApiKeyForDomainUseCase,
    );
    apiKeyRepository = module.get('API_KEY_REPOSITORY');
    keysGenerator = module.get('ApiKeyGenerateKeys');
    encryptService = module.get('ApiKeyEncryptPrivateKey');
    hashService = module.get('ApiKeyHasher');
  });

  const createMockApiKey = (domain: string): ApiKey => {
    return ApiKey.create({
      domain: new ApiKeyDomain(domain),
      apiKey: new ApiKeyValue('existing-api-key'),
      companyId: new ApiKeyCompanyId('test-company-id'),
      kid: new ApiKeyKid('test-kid'),
      privateKey: new ApiKeyPrivateKey('test-private-key'),
      publicKey: new ApiKeyPublicKey('test-public-key'),
    });
  };

  describe('execute', () => {
    it('debe normalizar el dominio eliminando www. al crear nueva API key', async () => {
      // Arrange
      const inputDomain = 'www.rmotion.es';
      const normalizedDomain = 'rmotion.es';
      const companyId = 'test-company-id';

      apiKeyRepository.getApiKeyByDomain.mockResolvedValue(null);
      hashService.hash
        .mockResolvedValueOnce('hashed-domain')
        .mockResolvedValueOnce('hashed-public-key');
      keysGenerator.generate.mockResolvedValue({
        publicKey: 'test-public-key',
        privateKey: 'test-private-key',
      });
      encryptService.encrypt.mockResolvedValue('encrypted-private-key');
      apiKeyRepository.save.mockResolvedValue();

      // Act
      const result = await useCase.execute(
        new ApiKeyDomain(inputDomain),
        new ApiKeyCompanyId(companyId),
      );

      // Assert
      expect(hashService.hash).toHaveBeenCalledWith(normalizedDomain);
      expect(apiKeyRepository.getApiKeyByDomain).toHaveBeenCalledWith(
        expect.objectContaining({
          value: normalizedDomain,
        }),
      );
      expect(result).toHaveProperty('apiKey');
      expect(typeof result.apiKey).toBe('string');
    });

    it('debe normalizar el dominio eliminando www. al buscar API key existente', async () => {
      // Arrange
      const inputDomain = 'www.rmotion.es';
      const normalizedDomain = 'rmotion.es';
      const companyId = 'test-company-id';
      const existingApiKey = createMockApiKey(normalizedDomain);

      apiKeyRepository.getApiKeyByDomain.mockResolvedValue(existingApiKey);

      // Act
      const result = await useCase.execute(
        new ApiKeyDomain(inputDomain),
        new ApiKeyCompanyId(companyId),
      );

      // Assert
      expect(apiKeyRepository.getApiKeyByDomain).toHaveBeenCalledWith(
        expect.objectContaining({
          value: normalizedDomain,
        }),
      );
      expect(result.apiKey).toBe(existingApiKey.apiKey.getValue());
    });

    it('debe crear nueva API key cuando no existe para el dominio normalizado', async () => {
      // Arrange
      const inputDomain = 'rmotion.es';
      const companyId = 'test-company-id';

      apiKeyRepository.getApiKeyByDomain.mockResolvedValue(null);
      hashService.hash
        .mockResolvedValueOnce('hashed-domain')
        .mockResolvedValueOnce('hashed-public-key');
      keysGenerator.generate.mockResolvedValue({
        publicKey: 'test-public-key',
        privateKey: 'test-private-key',
      });
      encryptService.encrypt.mockResolvedValue('encrypted-private-key');
      apiKeyRepository.save.mockResolvedValue();

      // Act
      const result = await useCase.execute(
        new ApiKeyDomain(inputDomain),
        new ApiKeyCompanyId(companyId),
      );

      // Assert
      expect(apiKeyRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('apiKey');
    });

    it('debe devolver API key existente cuando ya existe para el dominio', async () => {
      // Arrange
      const inputDomain = 'rmotion.es';
      const companyId = 'test-company-id';
      const existingApiKey = createMockApiKey(inputDomain);

      apiKeyRepository.getApiKeyByDomain.mockResolvedValue(existingApiKey);

      // Act
      const result = await useCase.execute(
        new ApiKeyDomain(inputDomain),
        new ApiKeyCompanyId(companyId),
      );

      // Assert
      expect(apiKeyRepository.save).not.toHaveBeenCalled();
      expect(result.apiKey).toBe(existingApiKey.apiKey.getValue());
    });
  });

  describe('normalizeDomain', () => {
    it('debe eliminar el prefijo www. correctamente', () => {
      // Act & Assert usando reflection para acceder al método privado
      const normalizedDomain = (useCase as any).normalizeDomain(
        'www.rmotion.es',
      );
      expect(normalizedDomain).toBe('rmotion.es');
    });

    it('debe mantener el dominio sin cambios si no tiene www', () => {
      // Act & Assert usando reflection para acceder al método privado
      const normalizedDomain = (useCase as any).normalizeDomain('rmotion.es');
      expect(normalizedDomain).toBe('rmotion.es');
    });

    it('debe manejar correctamente dominios complejos', () => {
      // Act & Assert usando reflection para acceder al método privado
      const normalizedDomain = (useCase as any).normalizeDomain(
        'www.sub.domain.example.com',
      );
      expect(normalizedDomain).toBe('sub.domain.example.com');
    });
  });
});
