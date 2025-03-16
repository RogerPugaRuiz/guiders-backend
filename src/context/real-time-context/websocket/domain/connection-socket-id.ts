import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ConnectionSocketId extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): PrimitiveValueObject<string> {
    return new ConnectionSocketId(value);
  }
}
