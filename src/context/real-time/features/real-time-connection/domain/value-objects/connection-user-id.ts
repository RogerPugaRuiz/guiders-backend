import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ConnectionUserId extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value);
  }
}
