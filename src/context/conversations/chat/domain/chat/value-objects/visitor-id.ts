import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class VisitorId extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value, (v) => v.length > 0, 'Invalid Visitor ID');
  }
}
