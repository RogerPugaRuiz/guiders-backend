// Prueba unitaria para AdminEmail
// Ubicación: src/context/company/domain/value-objects/__tests__/admin-email.spec.ts
import { AdminEmail } from '../admin-email';

describe('AdminEmail', () => {
  it('debe crear email de administrador válido', () => {
    const email = new AdminEmail('admin@company.com');
    expect(email.value).toBe('admin@company.com');
  });

  it('debe permitir email con diferentes dominios', () => {
    const email = new AdminEmail('user@test.org');
    expect(email.value).toBe('user@test.org');
  });

  it('debe permitir null como valor válido', () => {
    const email = new AdminEmail(null);
    expect(email.value).toBeNull();
  });

  it('debe lanzar error para email inválido', () => {
    expect(() => {
      new AdminEmail('invalid-email');
    }).toThrow('El email del administrador no es válido');
  });

  it('debe lanzar error para email sin @', () => {
    expect(() => {
      new AdminEmail('emailwithoutAt.com');
    }).toThrow('El email del administrador no es válido');
  });

  it('debe lanzar error para email sin dominio', () => {
    expect(() => {
      new AdminEmail('email@');
    }).toThrow('El email del administrador no es válido');
  });

  it('debe comparar correctamente dos emails iguales', () => {
    const email1 = new AdminEmail('test@example.com');
    const email2 = new AdminEmail('test@example.com');

    expect(email1.equals(email2)).toBe(true);
  });

  it('debe comparar correctamente dos emails diferentes', () => {
    const email1 = new AdminEmail('admin@company.com');
    const email2 = new AdminEmail('user@company.com');

    expect(email1.equals(email2)).toBe(false);
  });

  it('debe comparar correctamente null con null', () => {
    const email1 = new AdminEmail(null);
    const email2 = new AdminEmail(null);

    expect(email1.equals(email2)).toBe(true);
  });
});
