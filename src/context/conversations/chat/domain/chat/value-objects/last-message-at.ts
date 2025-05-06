import { PrimitiveValueObject } from '../../../../../shared/domain/primitive-value-object';

export class LastMessageAt extends PrimitiveValueObject<Date> {
  static create(value: Date): LastMessageAt {
    return new LastMessageAt(value);
  }
}
