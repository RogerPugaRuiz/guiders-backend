const validateConnectionDuration = (value: number): boolean => value >= 0;

import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class TrackingVisitorConnectionDuration extends PrimitiveValueObject<number> {
  constructor(value: number) {
    super(
      value,
      validateConnectionDuration,
      'TrackingVisitorConnectionDuration must be a non-negative number',
    );
  }
}
