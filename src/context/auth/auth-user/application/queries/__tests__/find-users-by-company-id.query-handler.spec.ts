// Prueba básica para FindUsersByCompanyIdQueryHandler
// Ubicación: src/context/auth/auth-user/application/queries/__tests__/find-users-by-company-id.query-handler.spec.ts
import { FindUsersByCompanyIdQueryHandler } from '../find-users-by-company-id.query-handler';
import { FindUsersByCompanyIdQuery } from '../find-users-by-company-id.query';
import { UserAccountRepository } from '../../../domain/user-account.repository';
import { UserAccountCompanyId } from '../../../domain/value-objects/user-account-company-id';

// Mock muy básico
const mockRepository: Partial<UserAccountRepository> = {
  findByCompanyId: jest.fn().mockResolvedValue([]),
};

describe('FindUsersByCompanyIdQueryHandler', () => {
  let handler: FindUsersByCompanyIdQueryHandler;

  beforeEach(() => {
    handler = new FindUsersByCompanyIdQueryHandler(
      mockRepository as UserAccountRepository,
    );
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  it('debe tener método execute', () => {
    expect(typeof handler.execute).toBe('function');
  });

  it('debe ejecutar query básica', async () => {
    const companyId = new UserAccountCompanyId(
      '550e8400-e29b-41d4-a716-446655440000',
    );
    const query = new FindUsersByCompanyIdQuery(companyId);

    const result = await handler.execute(query);

    expect(mockRepository.findByCompanyId).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
  });
});
