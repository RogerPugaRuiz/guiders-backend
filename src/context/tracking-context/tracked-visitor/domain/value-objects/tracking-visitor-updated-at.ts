const validateUpdatedAt = (value: Date): boolean => !isNaN(value.getTime());

import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class TrackingVisitorUpdatedAt extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(
      value,
      validateUpdatedAt,
      'TrackingVisitorUpdatedAt must be a valid date',
    );
  }
}
