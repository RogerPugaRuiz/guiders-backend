import { PrimitiveValueObject } from '../../../../../shared/domain/primitive-value-object';

export class LastMessage extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      (v) => typeof v === 'string' && v.length > 0,
      'Invalid Last Message',
    );
  }
}
