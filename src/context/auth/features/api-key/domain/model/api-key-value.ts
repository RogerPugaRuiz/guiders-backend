import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ApiKeyValue extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value);
  }
}
