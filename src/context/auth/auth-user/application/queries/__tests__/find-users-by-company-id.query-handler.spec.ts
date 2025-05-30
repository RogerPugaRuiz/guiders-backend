// Prueba básica para FindUsersByCompanyIdQueryHandler
// Ubicación: src/context/auth/auth-user/application/queries/__tests__/find-users-by-company-id.query-handler.spec.ts
import { FindUsersByCompanyIdQueryHandler } from '../find-users-by-company-id.query-handler';

// Mock muy básico
const mockRepository = {
  findByCompanyId: jest.fn().mockResolvedValue([])
};

// Mock básico de UserAccountCompanyId
class MockUserAccountCompanyId {
  constructor(public value: string) {}
}

// Mock básico de FindUsersByCompanyIdQuery
class MockQuery {
  constructor(public companyId: MockUserAccountCompanyId) {}
}

describe('FindUsersByCompanyIdQueryHandler', () => {
  let handler: FindUsersByCompanyIdQueryHandler;

  beforeEach(() => {
    handler = new FindUsersByCompanyIdQueryHandler(mockRepository as any);
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  it('debe tener método execute', () => {
    expect(typeof handler.execute).toBe('function');
  });

  it('debe ejecutar query básica', async () => {
    const companyId = new MockUserAccountCompanyId('company-123');
    const query = new MockQuery(companyId);

    const result = await handler.execute(query as any);

    expect(mockRepository.findByCompanyId).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
  });
});