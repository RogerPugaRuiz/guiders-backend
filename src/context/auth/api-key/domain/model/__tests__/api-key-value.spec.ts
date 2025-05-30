// Prueba unitaria para ApiKeyValue
// Ubicación: src/context/auth/api-key/domain/model/__tests__/api-key-value.spec.ts
import { ApiKeyValue } from '../api-key-value';

describe('ApiKeyValue', () => {
  it('debe crear un valor de API key', () => {
    const value = 'api-key-123456';
    const apiKeyValue = new ApiKeyValue(value);
    
    expect(apiKeyValue.value).toBe(value);
  });

  it('debe crear un valor de API key con diferentes formatos', () => {
    const value = 'sk-1234567890abcdef';
    const apiKeyValue = new ApiKeyValue(value);
    
    expect(apiKeyValue.value).toBe(value);
  });

  it('debe permitir valores vacíos', () => {
    const apiKeyValue = new ApiKeyValue('');
    
    expect(apiKeyValue.value).toBe('');
  });

  it('debe mantener el valor original sin modificaciones', () => {
    const value = 'API_KEY_WITH_SPECIAL_CHARS-123@#$';
    const apiKeyValue = new ApiKeyValue(value);
    
    expect(apiKeyValue.value).toBe(value);
  });
});