import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class VisitorAccountLastLoginAt extends PrimitiveValueObject<Date> {
  private constructor(value: Date) {
    super(value);
  }

  static create(value: Date): VisitorAccountLastLoginAt {
    return new VisitorAccountLastLoginAt(value);
  }

  static now(): VisitorAccountLastLoginAt {
    return new VisitorAccountLastLoginAt(new Date());
  }
}
