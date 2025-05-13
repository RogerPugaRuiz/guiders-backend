import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para el password del usuario. Permite null explícitamente.
export class UserAccountPassword extends PrimitiveValueObject<string | null> {
  constructor(value: string | null) {
    // Permite null o string, pero si es string debe ser no vacío
    super(value, (v) => v === null || (typeof v === 'string' && v.length >= 0));
  }

  // Indica si el password está vacío (no asignado)
  public isEmpty(): boolean {
    return this.value === null || this.value === '';
  }

  public static empty(): UserAccountPassword {
    return new UserAccountPassword(null);
  }
}
