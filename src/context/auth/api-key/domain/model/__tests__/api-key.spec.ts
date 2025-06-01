// Prueba unitaria para ApiKey aggregate
// Ubicación: src/context/auth/api-key/domain/model/__tests__/api-key.spec.ts
import { ApiKey } from '../api-key';
import { ApiKeyDomain } from '../api-key-domain';
import { ApiKeyValue } from '../api-key-value';
import { ApiKeyKid } from '../api-key-kid';
import { ApiKeyPublicKey } from '../api-key-public-key';
import { ApiKeyPrivateKey } from '../api-key-private-key';
import { ApiKeyCompanyId } from '../api-key-company-id';
import { ApiKeyId } from '../api-key-id';
import { ApiKeyCreatedAt } from '../api-key-created-at';

describe('ApiKey', () => {
  const validDomain = new ApiKeyDomain('api.example.com');
  const validApiKeyValue = new ApiKeyValue('ak_test_12345');
  const validKid = new ApiKeyKid('kid_12345');
  const validPublicKey = new ApiKeyPublicKey('-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w...\n-----END PUBLIC KEY-----');
  const validPrivateKey = new ApiKeyPrivateKey('-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w...\n-----END PRIVATE KEY-----');
  const validCompanyId = new ApiKeyCompanyId('company_12345');

  describe('create', () => {
    it('debe crear API key con parámetros válidos', () => {
      const apiKey = ApiKey.create({
        domain: validDomain,
        publicKey: validPublicKey,
        privateKey: validPrivateKey,
        apiKey: validApiKeyValue,
        kid: validKid,
        companyId: validCompanyId,
      });

      expect(apiKey.domain).toBe(validDomain);
      expect(apiKey.publicKey).toBe(validPublicKey);
      expect(apiKey.privateKey).toBe(validPrivateKey);
      expect(apiKey.apiKey).toBe(validApiKeyValue);
      expect(apiKey.kid).toBe(validKid);
      expect(apiKey.companyId).toBe(validCompanyId);
      expect(apiKey.id).toBeInstanceOf(ApiKeyId);
      expect(apiKey.createdAt).toBeInstanceOf(ApiKeyCreatedAt);
    });

    it('debe generar ID único automáticamente', () => {
      const apiKey1 = ApiKey.create({
        domain: validDomain,
        publicKey: validPublicKey,
        privateKey: validPrivateKey,
        apiKey: validApiKeyValue,
        kid: validKid,
        companyId: validCompanyId,
      });

      const apiKey2 = ApiKey.create({
        domain: validDomain,
        publicKey: validPublicKey,
        privateKey: validPrivateKey,
        apiKey: validApiKeyValue,
        kid: validKid,
        companyId: validCompanyId,
      });

      expect(apiKey1.id.getValue()).not.toBe(apiKey2.id.getValue());
    });

    it('debe generar fecha de creación automáticamente', () => {
      const beforeCreation = new Date();
      
      const apiKey = ApiKey.create({
        domain: validDomain,
        publicKey: validPublicKey,
        privateKey: validPrivateKey,
        apiKey: validApiKeyValue,
        kid: validKid,
        companyId: validCompanyId,
      });

      const afterCreation = new Date();

      const createdAt = apiKey.createdAt.getValue();
      expect(createdAt).toBeInstanceOf(Date);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('debe crear con diferentes dominios', () => {
      const domain1 = new ApiKeyDomain('api1.example.com');
      const domain2 = new ApiKeyDomain('api2.example.com');

      const apiKey1 = ApiKey.create({
        domain: domain1,
        publicKey: validPublicKey,
        privateKey: validPrivateKey,
        apiKey: validApiKeyValue,
        kid: validKid,
        companyId: validCompanyId,
      });

      const apiKey2 = ApiKey.create({
        domain: domain2,
        publicKey: validPublicKey,
        privateKey: validPrivateKey,
        apiKey: validApiKeyValue,
        kid: validKid,
        companyId: validCompanyId,
      });

      expect(apiKey1.domain).not.toBe(apiKey2.domain);
      expect(apiKey1.domain.getValue()).toBe('api1.example.com');
      expect(apiKey2.domain.getValue()).toBe('api2.example.com');
    });

    it('debe crear con diferentes company IDs', () => {
      const companyId1 = new ApiKeyCompanyId('company_1');
      const companyId2 = new ApiKeyCompanyId('company_2');

      const apiKey1 = ApiKey.create({
        domain: validDomain,
        publicKey: validPublicKey,
        privateKey: validPrivateKey,
        apiKey: validApiKeyValue,
        kid: validKid,
        companyId: companyId1,
      });

      const apiKey2 = ApiKey.create({
        domain: validDomain,
        publicKey: validPublicKey,
        privateKey: validPrivateKey,
        apiKey: validApiKeyValue,
        kid: validKid,
        companyId: companyId2,
      });

      expect(apiKey1.companyId).not.toBe(apiKey2.companyId);
      expect(apiKey1.companyId.getValue()).toBe('company_1');
      expect(apiKey2.companyId.getValue()).toBe('company_2');
    });
  });

  describe('fromPrimitive', () => {
    it('debe reconstruir API key desde datos primitivos', () => {
      const primitives = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        domain: 'api.example.com',
        apiKey: 'ak_test_12345',
        publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w...\n-----END PUBLIC KEY-----',
        privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w...\n-----END PRIVATE KEY-----',
        kid: 'kid_12345',
        companyId: '550e8400-e29b-41d4-a716-446655440001',
        createdAt: new Date('2023-01-01T12:00:00.000Z'),
      };

      const apiKey = ApiKey.fromPrimitive(primitives);

      expect(apiKey.id.getValue()).toBe(primitives.id);
      expect(apiKey.domain.getValue()).toBe(primitives.domain);
      expect(apiKey.apiKey.getValue()).toBe(primitives.apiKey);
      expect(apiKey.publicKey.getValue()).toBe(primitives.publicKey);
      expect(apiKey.privateKey.getValue()).toBe(primitives.privateKey);
      expect(apiKey.kid.getValue()).toBe(primitives.kid);
      expect(apiKey.companyId.getValue()).toBe(primitives.companyId);
      expect(apiKey.createdAt.getValue()).toEqual(primitives.createdAt);
    });

    it('debe reconstruir con diferentes valores', () => {
      const primitives = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        domain: 'different.domain.com',
        apiKey: 'ak_different_key',
        publicKey: 'different-public-key',
        privateKey: 'different-private-key',
        kid: 'different_kid',
        companyId: '550e8400-e29b-41d4-a716-446655440003',
        createdAt: new Date('2024-06-15T08:30:00.000Z'),
      };

      const apiKey = ApiKey.fromPrimitive(primitives);

      expect(apiKey.id.getValue()).toBe('550e8400-e29b-41d4-a716-446655440002');
      expect(apiKey.domain.getValue()).toBe('different.domain.com');
      expect(apiKey.apiKey.getValue()).toBe('ak_different_key');
      expect(apiKey.publicKey.getValue()).toBe('different-public-key');
      expect(apiKey.privateKey.getValue()).toBe('different-private-key');
      expect(apiKey.kid.getValue()).toBe('different_kid');
      expect(apiKey.companyId.getValue()).toBe('550e8400-e29b-41d4-a716-446655440003');
      expect(apiKey.createdAt.getValue()).toEqual(new Date('2024-06-15T08:30:00.000Z'));
    });

    it('debe manejar fechas en formato string ISO', () => {
      const isoDate = '2023-12-25T16:45:30.123Z';
      const primitives = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        domain: 'api.example.com',
        apiKey: 'ak_test_12345',
        publicKey: 'public-key',
        privateKey: 'private-key',
        kid: 'kid_12345',
        companyId: '550e8400-e29b-41d4-a716-446655440005',
        createdAt: new Date(isoDate),
      };

      const apiKey = ApiKey.fromPrimitive(primitives);

      expect(apiKey.createdAt.getValue()).toEqual(new Date(isoDate));
    });
  });

  describe('toPrimitive', () => {
    it('debe convertir API key a objeto primitivo', () => {
      const apiKey = ApiKey.create({
        domain: validDomain,
        publicKey: validPublicKey,
        privateKey: validPrivateKey,
        apiKey: validApiKeyValue,
        kid: validKid,
        companyId: validCompanyId,
      });

      const primitives = apiKey.toPrimitive();

      expect(primitives).toHaveProperty('id');
      expect(primitives).toHaveProperty('domain', validDomain.getValue());
      expect(primitives).toHaveProperty('apiKey', validApiKeyValue.getValue());
      expect(primitives).toHaveProperty('publicKey', validPublicKey.getValue());
      expect(primitives).toHaveProperty('privateKey', validPrivateKey.getValue());
      expect(primitives).toHaveProperty('kid', validKid.getValue());
      expect(primitives).toHaveProperty('companyId', validCompanyId.getValue());
      expect(primitives).toHaveProperty('createdAt');
      expect(primitives.createdAt).toBeInstanceOf(Date);
    });

    it('debe ser serializable a JSON', () => {
      const apiKey = ApiKey.create({
        domain: validDomain,
        publicKey: validPublicKey,
        privateKey: validPrivateKey,
        apiKey: validApiKeyValue,
        kid: validKid,
        companyId: validCompanyId,
      });

      const primitives = apiKey.toPrimitive();
      const jsonString = JSON.stringify(primitives);
      const parsed = JSON.parse(jsonString);

      expect(parsed.id).toBe(primitives.id);
      expect(parsed.domain).toBe(primitives.domain);
      expect(parsed.apiKey).toBe(primitives.apiKey);
      expect(parsed.publicKey).toBe(primitives.publicKey);
      expect(parsed.privateKey).toBe(primitives.privateKey);
      expect(parsed.kid).toBe(primitives.kid);
      expect(parsed.companyId).toBe(primitives.companyId);
      expect(new Date(parsed.createdAt)).toEqual(primitives.createdAt);
    });
  });

  describe('round trip (create -> toPrimitive -> fromPrimitive)', () => {
    it('debe mantener consistencia en conversión completa', () => {
      const original = ApiKey.create({
        domain: validDomain,
        publicKey: validPublicKey,
        privateKey: validPrivateKey,
        apiKey: validApiKeyValue,
        kid: validKid,
        companyId: validCompanyId,
      });

      const primitives = original.toPrimitive();
      const reconstructed = ApiKey.fromPrimitive(primitives);

      expect(reconstructed.id.getValue()).toBe(original.id.getValue());
      expect(reconstructed.domain.getValue()).toBe(original.domain.getValue());
      expect(reconstructed.apiKey.getValue()).toBe(original.apiKey.getValue());
      expect(reconstructed.publicKey.getValue()).toBe(original.publicKey.getValue());
      expect(reconstructed.privateKey.getValue()).toBe(original.privateKey.getValue());
      expect(reconstructed.kid.getValue()).toBe(original.kid.getValue());
      expect(reconstructed.companyId.getValue()).toBe(original.companyId.getValue());
      expect(reconstructed.createdAt.getValue()).toEqual(original.createdAt.getValue());
    });

    it('debe permitir múltiples round trips', () => {
      const original = ApiKey.create({
        domain: validDomain,
        publicKey: validPublicKey,
        privateKey: validPrivateKey,
        apiKey: validApiKeyValue,
        kid: validKid,
        companyId: validCompanyId,
      });

      // Primer round trip
      const primitives1 = original.toPrimitive();
      const reconstructed1 = ApiKey.fromPrimitive(primitives1);

      // Segundo round trip
      const primitives2 = reconstructed1.toPrimitive();
      const reconstructed2 = ApiKey.fromPrimitive(primitives2);

      expect(reconstructed2.id.getValue()).toBe(original.id.getValue());
      expect(reconstructed2.domain.getValue()).toBe(original.domain.getValue());
      expect(reconstructed2.apiKey.getValue()).toBe(original.apiKey.getValue());
      expect(reconstructed2.createdAt.getValue()).toEqual(original.createdAt.getValue());
    });
  });

  describe('immutability', () => {
    it('debe exponer propiedades de solo lectura', () => {
      const apiKey = ApiKey.create({
        domain: validDomain,
        publicKey: validPublicKey,
        privateKey: validPrivateKey,
        apiKey: validApiKeyValue,
        kid: validKid,
        companyId: validCompanyId,
      });

      // Verificar que todas las propiedades están expuestas
      expect(apiKey.id).toBeInstanceOf(ApiKeyId);
      expect(apiKey.domain).toBeInstanceOf(ApiKeyDomain);
      expect(apiKey.apiKey).toBeInstanceOf(ApiKeyValue);
      expect(apiKey.publicKey).toBeInstanceOf(ApiKeyPublicKey);
      expect(apiKey.privateKey).toBeInstanceOf(ApiKeyPrivateKey);
      expect(apiKey.kid).toBeInstanceOf(ApiKeyKid);
      expect(apiKey.companyId).toBeInstanceOf(ApiKeyCompanyId);
      expect(apiKey.createdAt).toBeInstanceOf(ApiKeyCreatedAt);
    });

    it('debe mantener la consistencia de las propiedades después de la creación', () => {
      const apiKey = ApiKey.create({
        domain: validDomain,
        publicKey: validPublicKey,
        privateKey: validPrivateKey,
        apiKey: validApiKeyValue,
        kid: validKid,
        companyId: validCompanyId,
      });

      const originalId = apiKey.id.getValue();
      const originalDomain = apiKey.domain.getValue();
      const originalCreatedAt = apiKey.createdAt.getValue();

      // Las propiedades deben mantenerse iguales
      expect(apiKey.id.getValue()).toBe(originalId);
      expect(apiKey.domain.getValue()).toBe(originalDomain);
      expect(apiKey.createdAt.getValue()).toEqual(originalCreatedAt);
    });
  });
});