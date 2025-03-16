import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ApiKeyCreatedAt extends PrimitiveValueObject<Date> {
  private constructor(value: Date) {
    super(value);
  }

  static create(value: Date): ApiKeyCreatedAt {
    return new ApiKeyCreatedAt(value);
  }

  static now(): ApiKeyCreatedAt {
    return new ApiKeyCreatedAt(new Date());
  }
}
