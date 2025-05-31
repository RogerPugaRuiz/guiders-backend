import { ApiKeyCompanyId } from '../api-key-company-id';

describe('ApiKeyCompanyId', () => {
  it('should create a valid company ID', () => {
    const companyId = 'company-123';
    const apiKeyCompanyId = new ApiKeyCompanyId(companyId);

    expect(apiKeyCompanyId.value).toBe(companyId);
  });

  it('should accept UUID format', () => {
    const uuidCompanyId = '550e8400-e29b-41d4-a716-446655440000';
    const apiKeyCompanyId = new ApiKeyCompanyId(uuidCompanyId);

    expect(apiKeyCompanyId.value).toBe(uuidCompanyId);
  });

  it('should throw error for empty string', () => {
    expect(() => new ApiKeyCompanyId('')).toThrow(
      'El companyId de la API Key no puede estar vacío'
    );
  });

  it('should throw error for string with only spaces', () => {
    expect(() => new ApiKeyCompanyId('   ')).toThrow(
      'El companyId de la API Key no puede estar vacío'
    );
  });

  it('should throw error for non-string value', () => {
    expect(() => new ApiKeyCompanyId(123 as any)).toThrow(
      'El companyId de la API Key no puede estar vacío'
    );
    expect(() => new ApiKeyCompanyId(null as any)).toThrow(
      'El companyId de la API Key no puede estar vacío'
    );
    expect(() => new ApiKeyCompanyId(undefined as any)).toThrow(
      'El companyId de la API Key no puede estar vacío'
    );
  });

  it('should accept alphanumeric company IDs', () => {
    const alphanumericId = 'company123ABC';
    const apiKeyCompanyId = new ApiKeyCompanyId(alphanumericId);

    expect(apiKeyCompanyId.value).toBe(alphanumericId);
  });

  it('should accept company IDs with special characters', () => {
    const specialId = 'company-123_ABC';
    const apiKeyCompanyId = new ApiKeyCompanyId(specialId);

    expect(apiKeyCompanyId.value).toBe(specialId);
  });
});