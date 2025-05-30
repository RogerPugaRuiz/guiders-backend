import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para la fecha de ocurrencia del evento de tracking
// Valida que la fecha sea una instancia válida de Date
const validateDate = (value: Date) =>
  value instanceof Date && !isNaN(value.getTime());

export class TrackingEventOccurredAt extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(
      value,
      validateDate,
      'La fecha de ocurrencia debe ser una fecha válida',
    );
  }
}
