import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ApiKeyValue extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  public static create(value: string): ApiKeyValue {
    return new ApiKeyValue(value);
  }
}
