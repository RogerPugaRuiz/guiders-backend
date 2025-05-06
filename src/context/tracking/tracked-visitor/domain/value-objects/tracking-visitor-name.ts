const validateVisitorName = (value: string): boolean => value.length > 0;

import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class TrackingVisitorName extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value, validateVisitorName, 'TrackingVisitorName cannot be empty');
  }
}
