import { PrimitiveValueObject } from '../../../../shared/domain/primitive-value-object';
import { validateDate } from '../../../../shared/domain/validation-utils';

// Objeto de valor para la fecha de última conexión de un visitante en tracking
// Valida que el valor sea una instancia de Date válida
export class TrackingUltimateConnectionDate extends PrimitiveValueObject<Date> {
  constructor(value: Date) {
    super(
      value,
      validateDate,
      'La fecha de última conexión debe ser una fecha válida',
    );
  }
}
