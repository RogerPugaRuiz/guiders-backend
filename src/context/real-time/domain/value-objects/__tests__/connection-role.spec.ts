// Prueba unitaria para ConnectionRole
// Ubicación: src/context/real-time/domain/value-objects/__tests__/connection-role.spec.ts
import { ConnectionRole, ConnectionRoleEnum } from '../connection-role';
import { ValidationError } from 'src/context/shared/domain/validation.error';

describe('ConnectionRole', () => {
  it('debe crear un rol de visitante válido', () => {
    const role = new ConnectionRole(ConnectionRoleEnum.VISITOR);
    expect(role.value).toBe('visitor');
  });

  it('debe crear un rol de comercial válido', () => {
    const role = new ConnectionRole(ConnectionRoleEnum.COMMERCIAL);
    expect(role.value).toBe('commercial');
  });

  it('debe crear un rol de admin válido', () => {
    const role = new ConnectionRole(ConnectionRoleEnum.ADMIN);
    expect(role.value).toBe('admin');
  });

  it('debe crear rol visitor usando método estático', () => {
    const role = ConnectionRole.visitor();
    expect(role.value).toBe('visitor');
    expect(role.isVisitor).toBe(true);
    expect(role.isCommercial).toBe(false);
  });

  it('debe crear rol commercial usando método estático', () => {
    const role = ConnectionRole.commercial();
    expect(role.value).toBe('commercial');
    expect(role.isCommercial).toBe(true);
    expect(role.isVisitor).toBe(false);
  });

  it('debe tener constantes estáticas definidas', () => {
    expect(ConnectionRole.COMMERCIAL).toBe('commercial');
    expect(ConnectionRole.VISITOR).toBe('visitor');
  });

  it('debe lanzar error para rol inválido', () => {
    expect(() => {
      new ConnectionRole('invalid_role');
    }).toThrow(ValidationError);
    expect(() => {
      new ConnectionRole('invalid_role');
    }).toThrow('Invalid ConnectionRole value: invalid_role');
  });

  it('debe lanzar error para rol vacío', () => {
    expect(() => {
      new ConnectionRole('');
    }).toThrow(ValidationError);
  });

  it('debe ser case sensitive', () => {
    expect(() => {
      new ConnectionRole('VISITOR');
    }).toThrow(ValidationError);
    expect(() => {
      new ConnectionRole('Commercial');
    }).toThrow(ValidationError);
  });

  it('debe identificar correctamente si es visitante', () => {
    const visitorRole = new ConnectionRole(ConnectionRoleEnum.VISITOR);
    const commercialRole = new ConnectionRole(ConnectionRoleEnum.COMMERCIAL);
    const adminRole = new ConnectionRole(ConnectionRoleEnum.ADMIN);

    expect(visitorRole.isVisitor).toBe(true);
    expect(commercialRole.isVisitor).toBe(false);
    expect(adminRole.isVisitor).toBe(false);
  });

  it('debe identificar correctamente si es comercial', () => {
    const visitorRole = new ConnectionRole(ConnectionRoleEnum.VISITOR);
    const commercialRole = new ConnectionRole(ConnectionRoleEnum.COMMERCIAL);
    const adminRole = new ConnectionRole(ConnectionRoleEnum.ADMIN);

    expect(visitorRole.isCommercial).toBe(false);
    expect(commercialRole.isCommercial).toBe(true);
    expect(adminRole.isCommercial).toBe(false);
  });

  it('debe comparar correctamente dos roles iguales', () => {
    const role1 = new ConnectionRole(ConnectionRoleEnum.VISITOR);
    const role2 = new ConnectionRole(ConnectionRoleEnum.VISITOR);

    expect(role1.equals(role2)).toBe(true);
  });

  it('debe comparar correctamente dos roles diferentes', () => {
    const visitorRole = new ConnectionRole(ConnectionRoleEnum.VISITOR);
    const commercialRole = new ConnectionRole(ConnectionRoleEnum.COMMERCIAL);

    expect(visitorRole.equals(commercialRole)).toBe(false);
  });
});
