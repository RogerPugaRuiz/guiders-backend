import { PrimitiveValueObject } from '../../../../../shared/domain/primitive-value-object';

export class CommercialLastReadAt extends PrimitiveValueObject<Date> {
  static create(value: Date): CommercialLastReadAt {
    return new CommercialLastReadAt(value);
  }
}
