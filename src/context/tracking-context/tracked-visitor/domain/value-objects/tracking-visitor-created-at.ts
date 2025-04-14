const validateCreatedAt = (value: Date): boolean => !isNaN(value.getTime());

import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class TrackingVisitorCreatedAt extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(
      value,
      validateCreatedAt,
      'TrackingVisitorCreatedAt must be a valid date',
    );
  }
}
