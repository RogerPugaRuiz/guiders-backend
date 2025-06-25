import { ConnectionCompanyId } from '../connection-company-id';

describe('ConnectionCompanyId', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const anotherValidUuid = '550e8400-e29b-41d4-a716-446655440001';

  it('debe crear companyId con UUID válido', () => {
    const companyId = new ConnectionCompanyId(validUuid);
    expect(companyId.value).toBe(validUuid);
  });

  it('debe crear companyId usando método estático create', () => {
    const companyId = ConnectionCompanyId.create(validUuid);
    expect(companyId.value).toBe(validUuid);
  });

  it('debe fallar al crear companyId con UUID inválido', () => {
    expect(() => new ConnectionCompanyId('invalid-uuid')).toThrow(
      'El companyId debe ser un UUID válido',
    );
  });

  it('debe fallar al crear companyId con cadena vacía', () => {
    expect(() => new ConnectionCompanyId('')).toThrow(
      'El companyId debe ser un UUID válido',
    );
  });

  it('debe comparar correctamente dos companyIds iguales', () => {
    const companyId1 = new ConnectionCompanyId(validUuid);
    const companyId2 = new ConnectionCompanyId(validUuid);

    expect(companyId1.equals(companyId2)).toBe(true);
  });

  it('debe comparar correctamente dos companyIds diferentes', () => {
    const companyId1 = new ConnectionCompanyId(validUuid);
    const companyId2 = new ConnectionCompanyId(anotherValidUuid);

    expect(companyId1.equals(companyId2)).toBe(false);
  });

  it('debe heredar métodos de PrimitiveValueObject', () => {
    const companyId = new ConnectionCompanyId(validUuid);

    expect(typeof companyId.equals).toBe('function');
    expect(typeof companyId.getValue).toBe('function');
    expect(companyId.getValue()).toBe(validUuid);
  });
});
