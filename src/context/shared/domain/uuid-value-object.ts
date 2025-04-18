import { PrimitiveValueObject } from './primitive-value-object';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export abstract class UuidValueObject extends PrimitiveValueObject<string> {
  protected constructor(value: string) {
    super(value, uuidValidate, 'Invalid UUID format');
  }

  public static generate(): string {
    return uuidv4();
  }

  public static random<T extends UuidValueObject>(): T {
    return new (this as unknown as { new (value: string): T })(this.generate());
  }

  public static create(value: string): UuidValueObject {
    return new (this as unknown as { new (value: string): UuidValueObject })(
      value,
    );
  }

  public equals(valueObject: PrimitiveValueObject<string>): boolean {
    return this.value === valueObject.getValue();
  }
}
