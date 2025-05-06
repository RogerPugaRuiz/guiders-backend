import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class VisitorAccountLastLoginAt extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(value);
  }

  static now(): VisitorAccountLastLoginAt {
    return new VisitorAccountLastLoginAt(new Date());
  }
}
