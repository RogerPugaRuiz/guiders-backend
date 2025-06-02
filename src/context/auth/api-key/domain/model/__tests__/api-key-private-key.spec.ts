// Prueba unitaria para ApiKeyPrivateKey
// Ubicación: src/context/auth/api-key/domain/model/__tests__/api-key-private-key.spec.ts
import { ApiKeyPrivateKey } from '../api-key-private-key';

describe('ApiKeyPrivateKey', () => {
  it('debe crear clave privada válida', () => {
    const privateKey =
      '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwgg...\n-----END PRIVATE KEY-----';
    const apiKeyPrivateKey = new ApiKeyPrivateKey(privateKey);
    expect(apiKeyPrivateKey.value).toBe(privateKey);
    expect(apiKeyPrivateKey.getValue()).toBe(privateKey);
  });

  it('debe crear con clave privada corta', () => {
    const privateKey = 'short-private-key';
    const apiKeyPrivateKey = new ApiKeyPrivateKey(privateKey);
    expect(apiKeyPrivateKey.value).toBe(privateKey);
  });

  it('debe crear con clave privada vacía', () => {
    const privateKey = '';
    const apiKeyPrivateKey = new ApiKeyPrivateKey(privateKey);
    expect(apiKeyPrivateKey.value).toBe(privateKey);
  });

  it('debe crear con clave privada con espacios', () => {
    const privateKey = '  key with spaces  ';
    const apiKeyPrivateKey = new ApiKeyPrivateKey(privateKey);
    expect(apiKeyPrivateKey.value).toBe(privateKey);
  });

  it('debe crear con clave privada con caracteres especiales', () => {
    const privateKey = 'key-with-special_chars.123!@#$%^&*()';
    const apiKeyPrivateKey = new ApiKeyPrivateKey(privateKey);
    expect(apiKeyPrivateKey.value).toBe(privateKey);
  });

  it('debe exponer valor a través de getValue()', () => {
    const privateKey = 'test-private-key';
    const apiKeyPrivateKey = new ApiKeyPrivateKey(privateKey);
    expect(apiKeyPrivateKey.getValue()).toBe(privateKey);
  });

  it('debe comparar correctamente dos claves privadas iguales', () => {
    const privateKey = 'same-private-key';
    const apiKeyPrivateKey1 = new ApiKeyPrivateKey(privateKey);
    const apiKeyPrivateKey2 = new ApiKeyPrivateKey(privateKey);

    expect(apiKeyPrivateKey1.equals(apiKeyPrivateKey2)).toBe(true);
  });

  it('debe comparar correctamente dos claves privadas diferentes', () => {
    const apiKeyPrivateKey1 = new ApiKeyPrivateKey('key1');
    const apiKeyPrivateKey2 = new ApiKeyPrivateKey('key2');

    expect(apiKeyPrivateKey1.equals(apiKeyPrivateKey2)).toBe(false);
  });

  it('debe ser case sensitive al comparar', () => {
    const apiKeyPrivateKey1 = new ApiKeyPrivateKey('PrivateKey');
    const apiKeyPrivateKey2 = new ApiKeyPrivateKey('privatekey');

    expect(apiKeyPrivateKey1.equals(apiKeyPrivateKey2)).toBe(false);
  });

  describe('encrypt', () => {
    it('debe encriptar la clave privada usando la función encriptador', async () => {
      const originalKey = 'original-private-key';
      const encryptedValue = 'encrypted-private-key';

      const mockEncryptor = jest.fn().mockResolvedValue(encryptedValue);

      const apiKeyPrivateKey = new ApiKeyPrivateKey(originalKey);
      const encryptedApiKey = await apiKeyPrivateKey.encrypt(mockEncryptor);

      expect(mockEncryptor).toHaveBeenCalledWith(originalKey);
      expect(encryptedApiKey).toBeInstanceOf(ApiKeyPrivateKey);
      expect(encryptedApiKey.getValue()).toBe(encryptedValue);
    });

    it('debe manejar encriptación con clave vacía', async () => {
      const originalKey = '';
      const encryptedValue = 'encrypted-empty-key';

      const mockEncryptor = jest.fn().mockResolvedValue(encryptedValue);

      const apiKeyPrivateKey = new ApiKeyPrivateKey(originalKey);
      const encryptedApiKey = await apiKeyPrivateKey.encrypt(mockEncryptor);

      expect(mockEncryptor).toHaveBeenCalledWith(originalKey);
      expect(encryptedApiKey.getValue()).toBe(encryptedValue);
    });

    it('debe propagar errores del encriptador', async () => {
      const originalKey = 'original-private-key';
      const errorMessage = 'Encryption failed';

      const mockEncryptor = jest
        .fn()
        .mockRejectedValue(new Error(errorMessage));

      const apiKeyPrivateKey = new ApiKeyPrivateKey(originalKey);

      await expect(apiKeyPrivateKey.encrypt(mockEncryptor)).rejects.toThrow(
        errorMessage,
      );
      expect(mockEncryptor).toHaveBeenCalledWith(originalKey);
    });

    it('debe manejar encriptador que devuelve una promesa', async () => {
      const originalKey = 'original-private-key';

      const mockEncryptor = (value: string) =>
        Promise.resolve(`encrypted-${value}`);

      const apiKeyPrivateKey = new ApiKeyPrivateKey(originalKey);
      const encryptedApiKey = await apiKeyPrivateKey.encrypt(mockEncryptor);

      expect(encryptedApiKey.getValue()).toBe('encrypted-original-private-key');
    });

    it('debe crear nueva instancia y no modificar la original', async () => {
      const originalKey = 'original-private-key';
      const encryptedValue = 'encrypted-private-key';

      const mockEncryptor = jest.fn().mockResolvedValue(encryptedValue);

      const originalApiKey = new ApiKeyPrivateKey(originalKey);
      const encryptedApiKey = await originalApiKey.encrypt(mockEncryptor);

      // La instancia original no debe cambiar
      expect(originalApiKey.getValue()).toBe(originalKey);
      // La nueva instancia debe tener el valor encriptado
      expect(encryptedApiKey.getValue()).toBe(encryptedValue);
      // Deben ser instancias diferentes
      expect(encryptedApiKey).not.toBe(originalApiKey);
    });
  });

  it('debe manejar null en el constructor', () => {
    expect(() => {
      new ApiKeyPrivateKey(null as any);
    }).not.toThrow();
  });

  it('debe manejar undefined en el constructor', () => {
    expect(() => {
      new ApiKeyPrivateKey(undefined as any);
    }).not.toThrow();
  });
});
