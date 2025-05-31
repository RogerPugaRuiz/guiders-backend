// Prueba básica para FindUsersByCompanyIdQuery
// Ubicación: src/context/auth/auth-user/application/queries/__tests__/find-users-by-company-id.query.spec.ts
import { FindUsersByCompanyIdQuery } from '../find-users-by-company-id.query';
import { UserAccountCompanyId } from '../../../domain/value-objects/user-account-company-id';

describe('FindUsersByCompanyIdQuery', () => {
  it('debe crear query con companyId', () => {
    const companyId = new UserAccountCompanyId(
      '550e8400-e29b-41d4-a716-446655440000',
    );
    const query = new FindUsersByCompanyIdQuery(companyId);

    expect(query).toBeDefined();
    expect(query.companyId).toBe(companyId);
  });

  it('debe almacenar companyId correctamente', () => {
    const companyId = new UserAccountCompanyId(
      '550e8400-e29b-41d4-a716-446655440001',
    );
    const query = new FindUsersByCompanyIdQuery(companyId);

    expect(query.companyId.value).toBe('550e8400-e29b-41d4-a716-446655440001');
  });
});
