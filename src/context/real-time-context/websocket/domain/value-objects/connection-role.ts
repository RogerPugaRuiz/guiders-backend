import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export type ConnectionRoleValue = 'visitor' | 'commercial';
export class ConnectionRole extends PrimitiveValueObject<string> {
  private static readonly VALID_VALUES = ['visitor', 'commercial'];
  private constructor(value: string) {
    super(value);
    if (!ConnectionRole.VALID_VALUES.includes(value)) {
      throw new Error(`Invalid ConnectionRole value: ${value}`);
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
