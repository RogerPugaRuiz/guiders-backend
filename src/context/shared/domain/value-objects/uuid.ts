import { PrimitiveValueObject } from '../primitive-value-object';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export class UUID extends PrimitiveValueObject<string> {
  constructor(readonly value: string) {
    super(value, uuidValidate, 'Invalid UUID format');
  }

  public static generate(): string {
    return uuidv4();
  }

  public static validate(value: string): boolean {
    return uuidValidate(value);
  }
}
