import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ApiKeyPrivateKey extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): ApiKeyPrivateKey {
    return new ApiKeyPrivateKey(value);
  }
}
