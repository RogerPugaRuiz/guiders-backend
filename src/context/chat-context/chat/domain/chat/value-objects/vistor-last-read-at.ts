import { PrimitiveValueObject } from '../../../../../shared/domain/primitive-value-object';

export class VistorLastReadAt extends PrimitiveValueObject<Date> {
  static create(value: Date): VistorLastReadAt {
    return new VistorLastReadAt(value);
  }
}
