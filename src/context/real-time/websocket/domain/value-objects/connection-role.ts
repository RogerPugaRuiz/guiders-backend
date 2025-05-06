import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import { ValidationError } from 'src/context/shared/domain/validation.error';

export enum ConnectionRoleEnum {
  VISITOR = 'visitor',
  COMMERCIAL = 'commercial',
}

export class ConnectionRole extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value);
    if (
      !Object.values(ConnectionRoleEnum).includes(value as ConnectionRoleEnum)
    ) {
      throw new ValidationError(`Invalid ConnectionRole value: ${value}`);
    }
  }

  static visitor(): ConnectionRole {
    return new ConnectionRole('visitor');
  }

  static commercial(): ConnectionRole {
    return new ConnectionRole('commercial');
  }

  static get COMMERCIAL(): string {
    return ConnectionRoleEnum.COMMERCIAL;
  }

  static get VISITOR(): string {
    return ConnectionRoleEnum.VISITOR;
  }

  get isVisitor(): boolean {
    return this.value === 'visitor';
  }

  get isCommercial(): boolean {
    return this.value === 'commercial';
  }
}
