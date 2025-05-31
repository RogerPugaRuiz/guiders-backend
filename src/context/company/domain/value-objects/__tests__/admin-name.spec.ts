// Prueba unitaria para AdminName
// Ubicación: src/context/company/domain/value-objects/__tests__/admin-name.spec.ts
import { AdminName } from '../admin-name';

describe('AdminName', () => {
  it('debe crear nombre de administrador válido', () => {
    const name = new AdminName('John Doe');
    expect(name.value).toBe('John Doe');
  });

  it('debe crear nombre con caracteres especiales', () => {
    const name = new AdminName('José María');
    expect(name.value).toBe('José María');
  });

  it('debe crear nombre con apellidos compuestos', () => {
    const name = new AdminName('Ana García-López');
    expect(name.value).toBe('Ana García-López');
  });

  it('debe lanzar error para nombre vacío', () => {
    expect(() => {
      new AdminName('');
    }).toThrow('El nombre del administrador no puede estar vacío');
  });

  it('debe comparar correctamente dos nombres iguales', () => {
    const name1 = new AdminName('Test Admin');
    const name2 = new AdminName('Test Admin');

    expect(name1.equals(name2)).toBe(true);
  });

  it('debe comparar correctamente dos nombres diferentes', () => {
    const name1 = new AdminName('Admin A');
    const name2 = new AdminName('Admin B');

    expect(name1.equals(name2)).toBe(false);
  });

  it('should accept single character names', () => {
    const name = new AdminName('A');
    expect(name.value).toBe('A');
  });

  it('should accept names with numbers', () => {
    const name = new AdminName('Admin123');
    expect(name.value).toBe('Admin123');
  });

  it('should throw error for null value', () => {
    expect(() => new AdminName(null as any)).toThrow(
      'El nombre del administrador no puede estar vacío'
    );
  });

  it('should throw error for undefined value', () => {
    expect(() => new AdminName(undefined as any)).toThrow(
      'El nombre del administrador no puede estar vacío'
    );
  });

  it('should preserve whitespace in names', () => {
    const nameWithSpaces = '  John   Doe  ';
    const name = new AdminName(nameWithSpaces);
    expect(name.value).toBe(nameWithSpaces);
  });
});
