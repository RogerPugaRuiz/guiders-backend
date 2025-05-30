import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Value object para el último login, permite null explícitamente
export class UserAccountLastLogin extends PrimitiveValueObject<Date | null> {
  constructor(value: Date | null) {
    super(value, (v) => v === null || v instanceof Date);
  }

  public isEmpty(): boolean {
    return this.value === null;
  }
}
