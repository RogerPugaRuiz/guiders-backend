import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ApiKeyKid extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): ApiKeyKid {
    return new ApiKeyKid(value);
  }
}
