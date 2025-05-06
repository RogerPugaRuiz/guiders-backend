import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class VisitorAccountUserAgent extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      (v) => typeof v === 'string' && v.length > 0,
      'Invalid User Agent',
    );
  }
}
