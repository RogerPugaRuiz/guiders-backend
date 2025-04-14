import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Validación: Verifica que el valor sea una instancia válida de Date
const validateLastActivityDate = (value: Date): boolean =>
  value instanceof Date && !isNaN(value.getTime());

export class TrackingVisitorLastActivityDate extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(
      value,
      validateLastActivityDate,
      'TrackingVisitorLastActivityDate must be a valid Date',
    );
  }
}
