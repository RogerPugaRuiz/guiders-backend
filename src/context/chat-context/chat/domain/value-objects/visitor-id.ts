import { PrimitiveValueObject } from '../../../../shared/domain/primitive-value-object';

export class VisitorId extends PrimitiveValueObject<string> {
  static create(value: string): VisitorId {
    return new VisitorId(value);
  }
}
