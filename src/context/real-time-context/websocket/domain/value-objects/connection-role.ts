import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import { ValidationError } from 'src/context/shared/domain/validation.error';

export enum ConnectionRoleEnum {
  VISITOR = 'visitor',
  COMMERCIAL = 'commercial',
}

export class ConnectionRole extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(value);
    if (
      !Object.values(ConnectionRoleEnum).includes(value as ConnectionRoleEnum)
    ) {
      throw new ValidationError(`Invalid ConnectionRole value: ${value}`);
    }
  }

  static create(value: string): ConnectionRole {
    return new ConnectionRole(value);
  }

  static visitor(): ConnectionRole {
    return new ConnectionRole('visitor');
  }

  static commercial(): ConnectionRole {
    return new ConnectionRole('commercial');
  }

  get isVisitor(): boolean {
    return this.value === 'visitor';
  }

  get isCommercial(): boolean {
    return this.value === 'commercial';
  }
}
