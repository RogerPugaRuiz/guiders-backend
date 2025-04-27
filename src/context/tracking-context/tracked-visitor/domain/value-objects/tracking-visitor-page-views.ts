import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Valida que el número de vistas de página sea un entero no negativo
const validatePageViews = (value: number): boolean =>
  Number.isInteger(value) && value >= 0;

// Value Object para el número de vistas de página
export class TrackingVisitorPageViews extends PrimitiveValueObject<number> {
  constructor(value: number) {
    super(
      value,
      validatePageViews,
      'TrackingVisitorPageViews debe ser un entero no negativo',
    );
  }
}
