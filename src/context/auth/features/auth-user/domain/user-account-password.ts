import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para el password del usuario. Permite null explícitamente.
export class UserAccountPassword extends PrimitiveValueObject<string | null> {
  constructor(value: string | null) {
    // Permite null o string, pero si es string debe cumplir reglas de seguridad
    super(
      value,
      (v) =>
        v === null ||
        (typeof v === 'string' && UserAccountPassword.isValidPassword(v)),
      'El password debe tener al menos 12 caracteres, incluir mayúsculas, minúsculas, un número y un símbolo.',
    );
  }

  // Valida las reglas de seguridad del password
  private static isValidPassword(password: string): boolean {
    if (password.length < 12) return false;
    if (!/[A-Z]/.test(password)) return false; // Al menos una mayúscula
    if (!/[a-z]/.test(password)) return false; // Al menos una minúscula
    if (!/[0-9]/.test(password)) return false; // Al menos un número
    if (!/[^A-Za-z0-9]/.test(password)) return false; // Al menos un símbolo
    return true;
  }

  // Indica si el password está vacío (no asignado)
  public isEmpty(): boolean {
    return this.value === null || this.value === '';
  }

  public static empty(): UserAccountPassword {
    return new UserAccountPassword(null);
  }
}
