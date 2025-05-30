// Prueba unitaria para ApiKeyKid
// Ubicación: src/context/auth/api-key/domain/model/__tests__/api-key-kid.spec.ts
import { ApiKeyKid } from '../api-key-kid';

describe('ApiKeyKid', () => {
  it('debe crear un key ID válido', () => {
    const kidValue = 'kid-123456';
    const apiKeyKid = new ApiKeyKid(kidValue);

    expect(apiKeyKid.value).toBe(kidValue);
  });

  it('debe crear un key ID con formato UUID', () => {
    const kidValue = '550e8400-e29b-41d4-a716-446655440000';
    const apiKeyKid = new ApiKeyKid(kidValue);

    expect(apiKeyKid.value).toBe(kidValue);
  });

  it('debe permitir diferentes formatos de key ID', () => {
    const kidValue = 'abc123def456';
    const apiKeyKid = new ApiKeyKid(kidValue);

    expect(apiKeyKid.value).toBe(kidValue);
  });
});
