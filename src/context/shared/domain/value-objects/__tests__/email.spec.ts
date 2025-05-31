// Prueba unitaria para Email
// Ubicación: src/context/shared/domain/value-objects/__tests__/email.spec.ts
import { Email } from '../email';

describe('Email', () => {
  it('debe crear email válido con formato correcto', () => {
    const validEmail = 'test@example.com';
    const email = new Email(validEmail);
    expect(email.value).toBe(validEmail);
  });

  it('debe crear email válido con dominio complejo', () => {
    const validEmail = 'user.name+test@sub.domain.example.com';
    const email = new Email(validEmail);
    expect(email.value).toBe(validEmail);
  });

  it('debe crear email válido con números', () => {
    const validEmail = 'user123@domain123.com';
    const email = new Email(validEmail);
    expect(email.value).toBe(validEmail);
  });

  it('debe lanzar error para email sin @', () => {
    expect(() => {
      new Email('invalid-email');
    }).toThrow('Email must be a valid email address');
  });

  it('debe lanzar error para email sin dominio', () => {
    expect(() => {
      new Email('user@');
    }).toThrow('Email must be a valid email address');
  });

  it('debe lanzar error para email sin usuario', () => {
    expect(() => {
      new Email('@domain.com');
    }).toThrow('Email must be a valid email address');
  });

  it('debe lanzar error para email vacío', () => {
    expect(() => {
      new Email('');
    }).toThrow('Email must be a valid email address');
  });

  it('debe lanzar error para email con espacios', () => {
    expect(() => {
      new Email('user @domain.com');
    }).toThrow('Email must be a valid email address');
  });

  it('debe comparar correctamente dos emails iguales', () => {
    const emailValue = 'test@example.com';
    const email1 = new Email(emailValue);
    const email2 = new Email(emailValue);

    expect(email1.equals(email2)).toBe(true);
  });

  it('debe comparar correctamente dos emails diferentes', () => {
    const email1 = new Email('test1@example.com');
    const email2 = new Email('test2@example.com');

    expect(email1.equals(email2)).toBe(false);
  });
});
