import { ApiKeyMapper } from '../api-key.mapper';
import { ApiKey } from '../../domain/model/api-key';
import { ApiKeyEntity } from '../api-key.entity';
import { ApiKeyDomain } from '../../domain/model/api-key-domain';
import { ApiKeyValue } from '../../domain/model/api-key-value';
import { ApiKeyCompanyId } from '../../domain/model/api-key-company-id';
import { ApiKeyKid } from '../../domain/model/api-key-kid';
import { ApiKeyPrivateKey } from '../../domain/model/api-key-private-key';
import { ApiKeyPublicKey } from '../../domain/model/api-key-public-key';

describe('ApiKeyMapper', () => {
  let mapper: ApiKeyMapper;

  beforeEach(() => {
    mapper = new ApiKeyMapper();
  });

  describe('toEntity', () => {
    it('should map domain object to entity', () => {
      // Arrange
      const apiKey = ApiKey.create({
        domain: new ApiKeyDomain('example.com'),
        apiKey: new ApiKeyValue('test-api-key'),
        companyId: new ApiKeyCompanyId('company-123'),
        kid: new ApiKeyKid('kid-123'),
        privateKey: new ApiKeyPrivateKey('private-key'),
        publicKey: new ApiKeyPublicKey('public-key'),
      });

      // Act
      const entity = mapper.toEntity(apiKey);

      // Assert
      expect(entity).toBeInstanceOf(ApiKeyEntity);
      expect(entity.id).toBeDefined();
      expect(entity.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(entity.domain).toBe('example.com');
      expect(entity.apiKey).toBe('test-api-key');
      expect(entity.companyId).toBe('company-123');
      expect(entity.kid).toBe('kid-123');
      expect(entity.privateKey).toBe('private-key');
      expect(entity.publicKey).toBe('public-key');
    });

    it('should create new entity instance for each mapping', () => {
      // Arrange
      const apiKey = createMockApiKey();

      // Act
      const entity1 = mapper.toEntity(apiKey);
      const entity2 = mapper.toEntity(apiKey);

      // Assert
      expect(entity1).not.toBe(entity2);
      expect(entity1.id).toBe(entity2.id);
    });
  });

  describe('toDomain', () => {
    it('should map entity to domain object', () => {
      // Arrange
      const createdAt = new Date('2024-01-01T10:00:00Z');
      const entity = new ApiKeyEntity();
      entity.id = '12345678-1234-4234-9234-123456789abc';
      entity.domain = 'example.com';
      entity.apiKey = 'test-api-key';
      entity.companyId = 'company-123';
      entity.createdAt = createdAt;
      entity.kid = 'kid-123';
      entity.privateKey = 'private-key';
      entity.publicKey = 'public-key';

      // Act
      const domainObject = mapper.toDomain(entity);

      // Assert
      expect(domainObject).toBeInstanceOf(ApiKey);
      expect(domainObject.id.getValue()).toBe(
        '12345678-1234-4234-9234-123456789abc',
      );
      expect(domainObject.domain.getValue()).toBe('example.com');
      expect(domainObject.apiKey.getValue()).toBe('test-api-key');
      expect(domainObject.companyId.getValue()).toBe('company-123');
      expect(domainObject.createdAt.getValue()).toBe(createdAt);
      expect(domainObject.kid.getValue()).toBe('kid-123');
      expect(domainObject.privateKey.getValue()).toBe('private-key');
      expect(domainObject.publicKey.getValue()).toBe('public-key');
    });

    it('should handle different entity values', () => {
      // Arrange
      const entity = new ApiKeyEntity();
      entity.id = 'aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee';
      entity.domain = 'different.com';
      entity.apiKey = 'different-key';
      entity.companyId = 'different-company';
      entity.createdAt = new Date('2023-12-25T15:30:00Z');
      entity.kid = 'different-kid';
      entity.privateKey = 'different-private';
      entity.publicKey = 'different-public';

      // Act
      const domainObject = mapper.toDomain(entity);

      // Assert
      expect(domainObject.id.getValue()).toBe(
        'aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee',
      );
      expect(domainObject.domain.getValue()).toBe('different.com');
      expect(domainObject.apiKey.getValue()).toBe('different-key');
      expect(domainObject.companyId.getValue()).toBe('different-company');
      expect(domainObject.kid.getValue()).toBe('different-kid');
      expect(domainObject.privateKey.getValue()).toBe('different-private');
      expect(domainObject.publicKey.getValue()).toBe('different-public');
    });
  });

  describe('round-trip mapping', () => {
    it('should preserve data through domain -> entity -> domain conversion', () => {
      // Arrange
      const originalApiKey = createMockApiKey();

      // Act
      const entity = mapper.toEntity(originalApiKey);
      const convertedApiKey = mapper.toDomain(entity);

      // Assert
      expect(convertedApiKey.id.getValue()).toBe(originalApiKey.id.getValue());
      expect(convertedApiKey.domain.getValue()).toBe(
        originalApiKey.domain.getValue(),
      );
      expect(convertedApiKey.apiKey.getValue()).toBe(
        originalApiKey.apiKey.getValue(),
      );
      expect(convertedApiKey.companyId.getValue()).toBe(
        originalApiKey.companyId.getValue(),
      );
      expect(convertedApiKey.createdAt.getValue()).toEqual(
        originalApiKey.createdAt.getValue(),
      );
      expect(convertedApiKey.kid.getValue()).toBe(
        originalApiKey.kid.getValue(),
      );
      expect(convertedApiKey.privateKey.getValue()).toBe(
        originalApiKey.privateKey.getValue(),
      );
      expect(convertedApiKey.publicKey.getValue()).toBe(
        originalApiKey.publicKey.getValue(),
      );
    });
  });

  // Helper function
  function createMockApiKey(): ApiKey {
    return ApiKey.create({
      domain: new ApiKeyDomain('test.com'),
      apiKey: new ApiKeyValue('test-key'),
      companyId: new ApiKeyCompanyId('test-company'),
      kid: new ApiKeyKid('test-kid'),
      privateKey: new ApiKeyPrivateKey('test-private'),
      publicKey: new ApiKeyPublicKey('test-public'),
    });
  }
});
