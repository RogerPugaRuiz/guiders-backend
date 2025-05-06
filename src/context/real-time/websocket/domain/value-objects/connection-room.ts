import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ConnectionRoom extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value);
  }
}
