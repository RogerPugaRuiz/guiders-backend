// Prueba unitaria para Role
// Ubicación: src/context/auth/auth-user/domain/value-objects/__tests__/role.spec.ts
import { Role, RoleEnum } from '../role';
import { ValidationError } from 'src/context/shared/domain/validation.error';

describe('Role', () => {
  it('debe crear un rol admin válido', () => {
    const role = new Role(RoleEnum.ADMIN);
    expect(role.value).toBe('admin');
  });

  it('debe crear un rol superadmin válido', () => {
    const role = new Role(RoleEnum.SUPERADMIN);
    expect(role.value).toBe('superadmin');
  });

  it('debe crear un rol commercial válido', () => {
    const role = new Role(RoleEnum.COMMERCIAL);
    expect(role.value).toBe('commercial');
  });

  it('debe crear rol admin usando método estático', () => {
    const role = Role.admin();
    expect(role.value).toBe('admin');
  });

  it('debe crear rol superadmin usando método estático', () => {
    const role = Role.superadmin();
    expect(role.value).toBe('superadmin');
  });

  it('debe crear rol commercial usando método estático', () => {
    const role = Role.commercial();
    expect(role.value).toBe('commercial');
  });

  it('debe crear rol desde primitivos', () => {
    const role = Role.fromPrimitives('admin');
    expect(role.value).toBe('admin');
  });

  it('debe serializar rol a primitivos', () => {
    const role = new Role(RoleEnum.ADMIN);
    expect(role.toPrimitives()).toBe('admin');
  });

  it('debe lanzar error para rol inválido', () => {
    expect(() => {
      new Role('invalid_role');
    }).toThrow(ValidationError);
    expect(() => {
      new Role('invalid_role');
    }).toThrow("El rol 'invalid_role' no es válido");
  });

  it('debe lanzar error para rol vacío', () => {
    expect(() => {
      new Role('');
    }).toThrow(ValidationError);
  });

  it('debe ser case sensitive', () => {
    expect(() => {
      new Role('ADMIN');
    }).toThrow(ValidationError);
    
    expect(() => {
      new Role('Admin');
    }).toThrow(ValidationError);
  });

  it('debe lanzar error para rol null', () => {
    expect(() => {
      new Role(null as any);
    }).toThrow(ValidationError);
  });

  it('debe lanzar error para rol undefined', () => {
    expect(() => {
      new Role(undefined as any);
    }).toThrow(ValidationError);
  });

  it('debe comparar correctamente dos roles iguales', () => {
    const role1 = new Role(RoleEnum.ADMIN);
    const role2 = new Role(RoleEnum.ADMIN);

    expect(role1.equals(role2)).toBe(true);
  });

  it('debe comparar correctamente dos roles diferentes', () => {
    const adminRole = new Role(RoleEnum.ADMIN);
    const commercialRole = new Role(RoleEnum.COMMERCIAL);

    expect(adminRole.equals(commercialRole)).toBe(false);
  });

  it('debe heredar métodos de PrimitiveValueObject', () => {
    const role = new Role(RoleEnum.ADMIN);
    
    expect(typeof role.equals).toBe('function');
    expect(typeof role.getValue).toBe('function');
    expect(role.getValue()).toBe('admin');
  });

  it('debe crear rol desde primitivos con roles válidos', () => {
    expect(() => Role.fromPrimitives('admin')).not.toThrow();
    expect(() => Role.fromPrimitives('superadmin')).not.toThrow();
    expect(() => Role.fromPrimitives('commercial')).not.toThrow();
  });

  it('debe fallar al crear rol desde primitivos con rol inválido', () => {
    expect(() => Role.fromPrimitives('invalid')).toThrow(ValidationError);
  });
});