import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export type ConnectionRoleValue = 'visitor' | 'commercial';
export class ConnectionRole extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: ConnectionRoleValue): ConnectionRole {
    return new ConnectionRole(value);
  }

  static visitor(): ConnectionRole {
    return new ConnectionRole('visitor');
  }

  static commercial(): ConnectionRole {
    return new ConnectionRole('commercial');
  }

  isVisitor(): boolean {
    return this.value === 'visitor';
  }

  isCommercial(): boolean {
    return this.value === 'commercial';
  }
}
