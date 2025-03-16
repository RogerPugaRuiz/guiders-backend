import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class VisitorAccountCreatedAt extends PrimitiveValueObject<Date> {
  private constructor(value: Date) {
    super(value);
  }

  static now(): VisitorAccountCreatedAt {
    return new VisitorAccountCreatedAt(new Date());
  }

  static create(value: Date): VisitorAccountCreatedAt {
    return new VisitorAccountCreatedAt(value);
  }
}
