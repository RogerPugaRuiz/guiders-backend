import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ApiKeyCreatedAt extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(value);
  }

  static now(): ApiKeyCreatedAt {
    return new ApiKeyCreatedAt(new Date());
  }
}
