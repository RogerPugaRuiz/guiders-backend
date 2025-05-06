import { PrimitiveValueObject } from '../../../../../shared/domain/primitive-value-object';

export class CommercialId extends PrimitiveValueObject<string> {
  static create(value: string): CommercialId {
    return new CommercialId(value);
  }
}
