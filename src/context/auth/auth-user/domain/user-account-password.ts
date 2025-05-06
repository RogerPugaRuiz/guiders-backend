import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class UserAccountPassword extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value);
  }
}
