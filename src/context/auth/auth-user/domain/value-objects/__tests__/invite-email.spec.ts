// Prueba unitaria para InviteEmail
// Ubicación: src/context/auth/auth-user/domain/value-objects/__tests__/invite-email.spec.ts
import { InviteEmail } from '../invite-email';

describe('InviteEmail', () => {
  it('debe crear un email de invitación válido', () => {
    const email = new InviteEmail('john.doe@example.com');
    expect(email.value).toBe('john.doe@example.com');
  });

  it('debe crear email con diferentes dominios válidos', () => {
    const validEmails = [
      'user@gmail.com',
      'test@company.org',
      'admin@subdomain.domain.co.uk',
      'contact@example.edu',
    ];

    validEmails.forEach((emailValue) => {
      const email = new InviteEmail(emailValue);
      expect(email.value).toBe(emailValue);
    });
  });

  it('debe crear email con números en el nombre', () => {
    const email = new InviteEmail('user123@example.com');
    expect(email.value).toBe('user123@example.com');
  });

  it('debe crear email con guiones y puntos', () => {
    const email = new InviteEmail('first.last-name@my-company.com');
    expect(email.value).toBe('first.last-name@my-company.com');
  });

  it('debe crear email con símbolos válidos', () => {
    const email = new InviteEmail('user+tag@example.com');
    expect(email.value).toBe('user+tag@example.com');
  });

  it('debe lanzar error para email inválido sin @', () => {
    expect(() => {
      new InviteEmail('invalid-email');
    }).toThrow('Email must be a valid email address');
  });

  it('debe lanzar error para email inválido sin dominio', () => {
    expect(() => {
      new InviteEmail('user@');
    }).toThrow('Email must be a valid email address');
  });

  it('debe lanzar error para email inválido sin nombre de usuario', () => {
    expect(() => {
      new InviteEmail('@example.com');
    }).toThrow('Email must be a valid email address');
  });

  it('debe lanzar error para email vacío', () => {
    expect(() => {
      new InviteEmail('');
    }).toThrow('Email must be a valid email address');
  });

  it('debe lanzar error para múltiples @', () => {
    expect(() => {
      new InviteEmail('user@@example.com');
    }).toThrow('Email must be a valid email address');
  });

  it('debe lanzar error para espacios en el email', () => {
    expect(() => {
      new InviteEmail('user name@example.com');
    }).toThrow('Email must be a valid email address');
  });

  it('debe lanzar error para formato de dominio inválido', () => {
    expect(() => {
      new InviteEmail('user@.com');
    }).toThrow('Email must be a valid email address');
  });

  it('debe comparar correctamente dos emails iguales', () => {
    const email1 = new InviteEmail('test@example.com');
    const email2 = new InviteEmail('test@example.com');

    expect(email1.equals(email2)).toBe(true);
  });

  it('debe comparar correctamente dos emails diferentes', () => {
    const email1 = new InviteEmail('user1@example.com');
    const email2 = new InviteEmail('user2@example.com');

    expect(email1.equals(email2)).toBe(false);
  });

  it('debe ser case sensitive en la comparación', () => {
    const email1 = new InviteEmail('User@Example.com');
    const email2 = new InviteEmail('user@example.com');

    expect(email1.equals(email2)).toBe(false);
  });

  it('debe heredar de Email', () => {
    const email = new InviteEmail('test@example.com');

    expect(typeof email.equals).toBe('function');
    expect(typeof email.getValue).toBe('function');
    expect(email.getValue()).toBe('test@example.com');
  });

  it('debe validar emails con dominios internacionales', () => {
    const internationalEmails = [
      'user@example.de',
      'test@empresa.es',
      'contact@site.fr',
    ];

    internationalEmails.forEach((emailValue) => {
      expect(() => {
        new InviteEmail(emailValue);
      }).not.toThrow();
    });
  });
});
