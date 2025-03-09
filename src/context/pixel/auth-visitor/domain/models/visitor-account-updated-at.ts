import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class VisitorAccountUpdatedAt extends PrimitiveValueObject<Date> {
  private constructor(value: Date) {
    super(value);
  }

  static create(value: Date): VisitorAccountUpdatedAt {
    return new VisitorAccountUpdatedAt(value);
  }
}
