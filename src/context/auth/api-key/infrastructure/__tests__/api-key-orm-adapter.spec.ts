import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyOrmAdapter } from '../api-key-orm-adapter';
import { ApiKeyEntity } from '../api-key.entity';
import { ApiKeyMapper } from '../api-key.mapper';
import { ApiKey } from '../../domain/model/api-key';
import { ApiKeyDomain } from '../../domain/model/api-key-domain';
import { ApiKeyValue } from '../../domain/model/api-key-value';
import { ApiKeyCompanyId } from '../../domain/model/api-key-company-id';
import { ApiKeyKid } from '../../domain/model/api-key-kid';
import { ApiKeyPrivateKey } from '../../domain/model/api-key-private-key';
import { ApiKeyPublicKey } from '../../domain/model/api-key-public-key';

describe('ApiKeyOrmAdapter', () => {
  let adapter: ApiKeyOrmAdapter;
  let repository: jest.Mocked<Repository<ApiKeyEntity>>;
  let mapper: jest.Mocked<ApiKeyMapper>;

  beforeEach(async () => {
    const repositoryMock = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mapperMock = {
      toEntity: jest.fn(),
      toDomain: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyOrmAdapter,
        {
          provide: getRepositoryToken(ApiKeyEntity),
          useValue: repositoryMock,
        },
        {
          provide: ApiKeyMapper,
          useValue: mapperMock,
        },
      ],
    }).compile();

    adapter = module.get<ApiKeyOrmAdapter>(ApiKeyOrmAdapter);
    repository = module.get(getRepositoryToken(ApiKeyEntity));
    mapper = module.get(ApiKeyMapper);
  });

  describe('save', () => {
    it('should save api key successfully', async () => {
      // Arrange
      const apiKey = createMockApiKey();
      const apiKeyEntity = createMockApiKeyEntity();

      const toEntitySpy = jest
        .spyOn(mapper, 'toEntity')
        .mockReturnValue(apiKeyEntity);
      const saveSpy = jest
        .spyOn(repository, 'save')
        .mockResolvedValue(apiKeyEntity);

      // Act
      await adapter.save(apiKey);

      // Assert
      expect(toEntitySpy).toHaveBeenCalledWith(apiKey);
      expect(saveSpy).toHaveBeenCalledWith(apiKeyEntity);
    });

    it('should handle save errors', async () => {
      // Arrange
      const apiKey = createMockApiKey();
      const apiKeyEntity = createMockApiKeyEntity();
      const error = new Error('Save failed');

      jest.spyOn(mapper, 'toEntity').mockReturnValue(apiKeyEntity);
      jest.spyOn(repository, 'save').mockRejectedValue(error);

      // Act & Assert
      await expect(adapter.save(apiKey)).rejects.toThrow('Save failed');
    });
  });

  describe('getApiKeyByDomain', () => {
    it('should return api key when found by domain', async () => {
      // Arrange
      const domain = new ApiKeyDomain('example.com');
      const apiKeyEntity = createMockApiKeyEntity();
      const apiKey = createMockApiKey();

      const findOneSpy = jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue(apiKeyEntity);
      const toDomainSpy = jest
        .spyOn(mapper, 'toDomain')
        .mockReturnValue(apiKey);

      // Act
      const result = await adapter.getApiKeyByDomain(domain);

      // Assert
      expect(result).toBe(apiKey);
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { domain: domain.getValue() },
      });
      expect(toDomainSpy).toHaveBeenCalledWith(apiKeyEntity);
    });

    it('should return null when api key not found by domain', async () => {
      // Arrange
      const domain = new ApiKeyDomain('nonexistent.com');
      const findOneSpy = jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue(null);
      const toDomainSpy = jest.spyOn(mapper, 'toDomain');

      // Act
      const result = await adapter.getApiKeyByDomain(domain);

      // Assert
      expect(result).toBeNull();
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { domain: domain.getValue() },
      });
      expect(toDomainSpy).not.toHaveBeenCalled();
    });
  });

  describe('getApiKeyByApiKey', () => {
    it('should return api key when found by api key value', async () => {
      // Arrange
      const apiKeyValue = new ApiKeyValue('test-api-key');
      const apiKeyEntity = createMockApiKeyEntity();
      const apiKey = createMockApiKey();

      const findOneSpy = jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue(apiKeyEntity);
      const toDomainSpy = jest
        .spyOn(mapper, 'toDomain')
        .mockReturnValue(apiKey);

      // Act
      const result = await adapter.getApiKeyByApiKey(apiKeyValue);

      // Assert
      expect(result).toBe(apiKey);
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { apiKey: apiKeyValue.getValue() },
      });
      expect(toDomainSpy).toHaveBeenCalledWith(apiKeyEntity);
    });

    it('should return null when api key not found by api key value', async () => {
      // Arrange
      const apiKeyValue = new ApiKeyValue('nonexistent-key');
      const findOneSpy = jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue(null);
      const toDomainSpy = jest.spyOn(mapper, 'toDomain');

      // Act
      const result = await adapter.getApiKeyByApiKey(apiKeyValue);

      // Assert
      expect(result).toBeNull();
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { apiKey: apiKeyValue.getValue() },
      });
      expect(toDomainSpy).not.toHaveBeenCalled();
    });
  });

  describe('getAllApiKeys', () => {
    it('should return all api keys', async () => {
      // Arrange
      const apiKeyEntities = [
        createMockApiKeyEntity(),
        createMockApiKeyEntity(),
      ];
      const apiKeys = [createMockApiKey(), createMockApiKey()];

      const findSpy = jest
        .spyOn(repository, 'find')
        .mockResolvedValue(apiKeyEntities);
      const toDomainSpy = jest
        .spyOn(mapper, 'toDomain')
        .mockReturnValueOnce(apiKeys[0])
        .mockReturnValueOnce(apiKeys[1]);

      // Act
      const result = await adapter.getAllApiKeys();

      // Assert
      expect(result).toEqual(apiKeys);
      expect(findSpy).toHaveBeenCalled();
      expect(toDomainSpy).toHaveBeenCalledTimes(2);
      expect(toDomainSpy).toHaveBeenNthCalledWith(1, apiKeyEntities[0]);
      expect(toDomainSpy).toHaveBeenNthCalledWith(2, apiKeyEntities[1]);
    });

    it('should return empty array when no api keys found', async () => {
      // Arrange
      const findSpy = jest.spyOn(repository, 'find').mockResolvedValue([]);
      const toDomainSpy = jest.spyOn(mapper, 'toDomain');

      // Act
      const result = await adapter.getAllApiKeys();

      // Assert
      expect(result).toEqual([]);
      expect(findSpy).toHaveBeenCalled();
      expect(toDomainSpy).not.toHaveBeenCalled();
    });
  });

  // Helper functions
  function createMockApiKey(): ApiKey {
    return ApiKey.create({
      domain: new ApiKeyDomain('example.com'),
      apiKey: new ApiKeyValue('test-api-key'),
      companyId: new ApiKeyCompanyId('company-123'),
      kid: new ApiKeyKid('kid-123'),
      privateKey: new ApiKeyPrivateKey('private-key'),
      publicKey: new ApiKeyPublicKey('public-key'),
    });
  }

  function createMockApiKeyEntity(): ApiKeyEntity {
    const entity = new ApiKeyEntity();
    entity.id = 'api-key-123';
    entity.domain = 'example.com';
    entity.apiKey = 'test-api-key';
    entity.companyId = 'company-123';
    entity.createdAt = new Date();
    entity.kid = 'kid-123';
    entity.privateKey = 'private-key';
    entity.publicKey = 'public-key';
    return entity;
  }
});
