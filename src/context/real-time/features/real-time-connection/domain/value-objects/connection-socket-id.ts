import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ConnectionSocketId extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value);
  }
}
