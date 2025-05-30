import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import { Role } from './role';

// Objeto de valor para los roles de la cuenta de usuario
// Valida que cada elemento sea una instancia de Role
const validateRoles = (roles: Role[]): boolean =>
  Array.isArray(roles) && roles.every((role) => role instanceof Role);

export class UserAccountRoles extends PrimitiveValueObject<Role[]> {
  constructor(value: Role[]) {
    super(
      value,
      validateRoles,
      'Todos los roles deben ser instancias válidas de Role',
    );
  }

  // Serializa a array de strings
  public toPrimitives(): string[] {
    return this.value.map((role) => role.toPrimitives());
  }

  // Método de fábrica para crear desde array de strings
  public static fromPrimitives(roles: string[]): UserAccountRoles {
    return new UserAccountRoles(roles.map((r) => Role.fromPrimitives(r)));
  }

  // Método de fábrica para crear desde array de Role
  public static fromRoles(roles: Role[]): UserAccountRoles {
    return new UserAccountRoles(roles);
  }

  // Devuelve los roles como array de Role
  public getRoles(): Role[] {
    return [...this.value];
  }
}
