import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import { ValidationError } from 'src/context/shared/domain/validation.error';

// Enum con los roles permitidos en el sistema
export enum RoleEnum {
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
  COMMERCIAL = 'commercial',
}

// Value Object para un rol individual
export class Role extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value);
    if (!Object.values(RoleEnum).includes(value as RoleEnum)) {
      throw new ValidationError(`El rol '${value}' no es válido`);
    }
  }

  // Métodos de fábrica para cada rol
  static admin(): Role {
    return new Role(RoleEnum.ADMIN);
  }
  static superadmin(): Role {
    return new Role(RoleEnum.SUPERADMIN);
  }
  static commercial(): Role {
    return new Role(RoleEnum.COMMERCIAL);
  }

  // Serializa el rol a primitivo
  public toPrimitives(): string {
    return this.value;
  }

  // Método de fábrica desde primitivo
  public static fromPrimitives(value: string): Role {
    return new Role(value);
  }
}
