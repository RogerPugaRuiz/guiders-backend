// Prueba unitaria para ApiKeyPublicKey
// Ubicación: src/context/auth/api-key/domain/model/__tests__/api-key-public-key.spec.ts
import { ApiKeyPublicKey } from '../api-key-public-key';

describe('ApiKeyPublicKey', () => {
  it('debe crear clave pública válida', () => {
    const publicKey = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----';
    const apiKeyPublicKey = new ApiKeyPublicKey(publicKey);
    expect(apiKeyPublicKey.value).toBe(publicKey);
    expect(apiKeyPublicKey.getValue()).toBe(publicKey);
  });

  it('debe crear con clave pública corta', () => {
    const publicKey = 'short-public-key';
    const apiKeyPublicKey = new ApiKeyPublicKey(publicKey);
    expect(apiKeyPublicKey.value).toBe(publicKey);
  });

  it('debe crear con clave pública vacía', () => {
    const publicKey = '';
    const apiKeyPublicKey = new ApiKeyPublicKey(publicKey);
    expect(apiKeyPublicKey.value).toBe(publicKey);
  });

  it('debe crear con clave pública con espacios', () => {
    const publicKey = '  key with spaces  ';
    const apiKeyPublicKey = new ApiKeyPublicKey(publicKey);
    expect(apiKeyPublicKey.value).toBe(publicKey);
  });

  it('debe crear con clave pública con caracteres especiales', () => {
    const publicKey = 'key-with-special_chars.123!@#$%^&*()';
    const apiKeyPublicKey = new ApiKeyPublicKey(publicKey);
    expect(apiKeyPublicKey.value).toBe(publicKey);
  });

  it('debe exponer valor a través de getValue()', () => {
    const publicKey = 'test-public-key';
    const apiKeyPublicKey = new ApiKeyPublicKey(publicKey);
    expect(apiKeyPublicKey.getValue()).toBe(publicKey);
  });

  it('debe comparar correctamente dos claves públicas iguales', () => {
    const publicKey = 'same-public-key';
    const apiKeyPublicKey1 = new ApiKeyPublicKey(publicKey);
    const apiKeyPublicKey2 = new ApiKeyPublicKey(publicKey);

    expect(apiKeyPublicKey1.equals(apiKeyPublicKey2)).toBe(true);
  });

  it('debe comparar correctamente dos claves públicas diferentes', () => {
    const apiKeyPublicKey1 = new ApiKeyPublicKey('key1');
    const apiKeyPublicKey2 = new ApiKeyPublicKey('key2');

    expect(apiKeyPublicKey1.equals(apiKeyPublicKey2)).toBe(false);
  });

  it('debe ser case sensitive al comparar', () => {
    const apiKeyPublicKey1 = new ApiKeyPublicKey('PublicKey');
    const apiKeyPublicKey2 = new ApiKeyPublicKey('publickey');

    expect(apiKeyPublicKey1.equals(apiKeyPublicKey2)).toBe(false);
  });

  it('debe manejar null en el constructor', () => {
    expect(() => {
      new ApiKeyPublicKey(null as any);
    }).not.toThrow();
  });

  it('debe manejar undefined en el constructor', () => {
    expect(() => {
      new ApiKeyPublicKey(undefined as any);
    }).not.toThrow();
  });
});