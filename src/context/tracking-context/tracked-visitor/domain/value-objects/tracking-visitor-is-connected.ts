const validateIsConnected = (value: boolean): boolean =>
  typeof value === 'boolean';

import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class TrackingVisitorIsConnected extends PrimitiveValueObject<boolean> {
  constructor(value: boolean) {
    super(
      value,
      validateIsConnected,
      'TrackingVisitorIsConnected must be a boolean value',
    );
  }
}
