// Prueba básica para FindUsersByCompanyIdQuery
// Ubicación: src/context/auth/auth-user/application/queries/__tests__/find-users-by-company-id.query.spec.ts
import { FindUsersByCompanyIdQuery } from '../find-users-by-company-id.query';

// Mock básico de UserAccountCompanyId
class MockUserAccountCompanyId {
  constructor(public value: string) {}
}

describe('FindUsersByCompanyIdQuery', () => {
  it('debe crear query con companyId', () => {
    const companyId = new MockUserAccountCompanyId('company-123');
    const query = new FindUsersByCompanyIdQuery(companyId as any);

    expect(query).toBeDefined();
    expect(query.companyId).toBe(companyId);
  });

  it('debe almacenar companyId correctamente', () => {
    const companyId = new MockUserAccountCompanyId('test-company');
    const query = new FindUsersByCompanyIdQuery(companyId as any);

    expect(query.companyId.value).toBe('test-company');
  });
});