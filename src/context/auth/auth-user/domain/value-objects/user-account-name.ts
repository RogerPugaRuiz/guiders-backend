// Objeto de valor para el nombre de la cuenta de usuario
// Ubicación: src/context/auth/auth-user/domain/value-objects/user-account-name.ts
import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Encapsula el nombre de la cuenta de usuario y su validación
export class UserAccountName extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      (v) => !!v && v.length > 0,
      'El nombre de la cuenta de usuario no puede estar vacío',
    );
  }
}
