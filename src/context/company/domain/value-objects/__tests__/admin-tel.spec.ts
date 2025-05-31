import { AdminTel } from '../admin-tel';

describe('AdminTel', () => {
  it('should create with valid 9-digit phone number', () => {
    const phoneNumber = '123456789';
    const adminTel = new AdminTel(phoneNumber);

    expect(adminTel.value).toBe(phoneNumber);
  });

  it('should accept null value', () => {
    const adminTel = new AdminTel(null);
    expect(adminTel.value).toBe(null);
  });

  it('should accept exactly 9 digits', () => {
    const nineDigits = '987654321';
    const adminTel = new AdminTel(nineDigits);

    expect(adminTel.value).toBe(nineDigits);
  });

  it('should throw error for phone with letters', () => {
    expect(() => new AdminTel('12345678a')).toThrow(
      'El teléfono del administrador no es válido'
    );
  });

  it('should throw error for phone with special characters', () => {
    expect(() => new AdminTel('123-456-789')).toThrow(
      'El teléfono del administrador no es válido'
    );
  });

  it('should throw error for empty string', () => {
    expect(() => new AdminTel('')).toThrow(
      'El teléfono del administrador no es válido'
    );
  });

  it('should throw error for phone with less than 9 digits', () => {
    expect(() => new AdminTel('12345678')).toThrow(
      'El teléfono del administrador no es válido'
    );
  });

  it('should throw error for phone with more than 9 digits', () => {
    expect(() => new AdminTel('1234567890')).toThrow(
      'El teléfono del administrador no es válido'
    );
  });

  it('should throw error for phone with spaces', () => {
    expect(() => new AdminTel('123 456 789')).toThrow(
      'El teléfono del administrador no es válido'
    );
  });

  it('should throw error for phone starting with +', () => {
    expect(() => new AdminTel('+123456789')).toThrow(
      'El teléfono del administrador no es válido'
    );
  });

  it('should throw error for undefined value', () => {
    expect(() => new AdminTel(undefined as any)).toThrow(
      'El teléfono del administrador no es válido'
    );
  });

  it('should equal another AdminTel with same value', () => {
    const tel1 = new AdminTel('123456789');
    const tel2 = new AdminTel('123456789');

    expect(tel1.equals(tel2)).toBe(true);
  });

  it('should equal another AdminTel with null values', () => {
    const tel1 = new AdminTel(null);
    const tel2 = new AdminTel(null);

    expect(tel1.equals(tel2)).toBe(true);
  });

  it('should not equal AdminTel with different values', () => {
    const tel1 = new AdminTel('123456789');
    const tel2 = new AdminTel('987654321');

    expect(tel1.equals(tel2)).toBe(false);
  });
});