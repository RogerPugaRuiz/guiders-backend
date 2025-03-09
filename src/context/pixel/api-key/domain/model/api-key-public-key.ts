import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ApiKeyPublicKey extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): ApiKeyPublicKey {
    return new ApiKeyPublicKey(value);
  }
}
