// Prueba unitaria para UserAccountName
// Ubicación: src/context/auth/auth-user/domain/value-objects/__tests__/user-account-name.spec.ts
import { UserAccountName } from '../user-account-name';

describe('UserAccountName', () => {
  it('debe crear nombre de cuenta de usuario válido', () => {
    const name = new UserAccountName('John Doe');
    expect(name.value).toBe('John Doe');
  });

  it('debe crear nombre con caracteres especiales', () => {
    const name = new UserAccountName('José María');
    expect(name.value).toBe('José María');
  });

  it('debe crear nombre con apellidos compuestos', () => {
    const name = new UserAccountName('Ana García-López');
    expect(name.value).toBe('Ana García-López');
  });

  it('debe lanzar error para nombre vacío', () => {
    expect(() => {
      new UserAccountName('');
    }).toThrow('El nombre de la cuenta de usuario no puede estar vacío');
  });

  it('debe comparar correctamente dos nombres iguales', () => {
    const name1 = new UserAccountName('Test User');
    const name2 = new UserAccountName('Test User');

    expect(name1.equals(name2)).toBe(true);
  });

  it('debe comparar correctamente dos nombres diferentes', () => {
    const name1 = new UserAccountName('User A');
    const name2 = new UserAccountName('User B');

    expect(name1.equals(name2)).toBe(false);
  });

  it('should accept single character names', () => {
    const name = new UserAccountName('A');
    expect(name.value).toBe('A');
  });

  it('should accept names with numbers', () => {
    const name = new UserAccountName('User123');
    expect(name.value).toBe('User123');
  });

  it('should throw error for null value', () => {
    expect(() => new UserAccountName(null as unknown as string)).toThrow(
      'El nombre de la cuenta de usuario no puede estar vacío',
    );
  });

  it('should throw error for undefined value', () => {
    expect(() => new UserAccountName(undefined as unknown as string)).toThrow(
      'El nombre de la cuenta de usuario no puede estar vacío',
    );
  });

  it('should preserve whitespace in names', () => {
    const nameWithSpaces = '  John   Doe  ';
    const name = new UserAccountName(nameWithSpaces);
    expect(name.value).toBe(nameWithSpaces);
  });

  it('should accept names with unicode characters', () => {
    const unicodeName = 'João 世界 مرحبا';
    const name = new UserAccountName(unicodeName);
    expect(name.value).toBe(unicodeName);
  });
});
