import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Valida que la fecha sea un objeto Date o null
const validateLastVisitedAt = (value: Date | null): boolean => {
  return value === null || value instanceof Date;
};

// Value Object para la fecha de la última visita
export class TrackingVisitorLastVisitedAt extends PrimitiveValueObject<Date | null> {
  constructor(value: Date | null) {
    super(
      value,
      validateLastVisitedAt,
      'TrackingVisitorLastVisitedAt debe ser una fecha válida o null',
    );
  }
}
